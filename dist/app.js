import { Chess } from './vendor/chess.js';
import { defaults, names, read, initialProfile, assign, record } from './profile.js';
import { animateMove } from './motion.js';

const roles = {
  p: ['pikachu', 'Пикачу', 'Пешка', '♟', 'Идёт вперёд, берёт наискосок.'],
  n: ['ponyta', 'Понита', 'Конь', '♞', 'Прыгает буквой «Г».'],
  r: ['squirtle', 'Сквиртл', 'Ладья', '♜', 'Ходит по прямой.'],
  b: ['alakazam', 'Алаказам', 'Слон', '♝', 'Ходит наискосок.'],
  q: ['gardevoir', 'Гардевуар', 'Ферзь', '♛', 'Ходит по прямой и наискосок.'],
  k: ['snorlax', 'Снорлакс', 'Король', '♚', 'Ходит на одну клетку.']
};
const get = id => document.getElementById(id);
let game = new Chess();
let arena = 0;
let done = false;
let selected = null;
let pendingPromotion = null;
let botTimer;
const savedState = read('chessgo-v3');
const profile = savedState?.profile || initialProfile(read('chessgo-progress') || {});
const savedGame = savedState?.game || read('chessgo-game');
let gameId = savedGame?.id || crypto.randomUUID();
let moving = false;
let inGame = false;
try {
  if (savedGame) {
    game.loadPgn(savedGame.pgn);
    arena = Number(savedGame.arena) || 0;
    done = Boolean(savedGame.finished);
  }
} catch { game = new Chess(); done = false; }
function persist() {
  const current = {id:gameId,pgn:game.pgn(),arena,finished:done};
  try { localStorage.setItem('chessgo-v3', JSON.stringify({profile,game:current})); }
  catch { /* Play can continue if the device is out of storage. */ }
}
function identity(type, color = 'w') {
  const art = color === 'w' ? profile.team[type] : defaults[type];
  return [art, names[art], ...roles[type].slice(2)];
}
function roleEntry(type, tag = 'div') {
  const [art, name, role] = identity(type);
  const element = document.createElement(tag);
  element.className = 'entry';
  element.innerHTML = '<img alt="" src="art/' + art + '.png"><div><b>' + role + '</b><small>' + name + '</small></div>';
  return element;
}


function render() {
  const options = selected ? game.moves({square:selected,verbose:true}) : [];
  const last = game.history({verbose:true}).at(-1);
  const board = document.createDocumentFragment();
  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = 'abcdefgh'[file] + rank;
      const piece = game.get(square);
      const button = document.createElement('button');
      button.className = 'square';
      button.dataset.square = square;
      button.classList.toggle('dark', (rank + file) % 2 === 1);
      button.classList.toggle('last', last?.from === square || last?.to === square);
      button.classList.toggle('selected', selected === square);
      let label = square;
      if (piece) {
        const [art, name, role, symbol] = identity(piece.type,piece.color);
        button.classList.add('occupied', piece.color === 'b' ? 'black' : 'white');
        button.innerHTML = '<img draggable="false" alt="" src="art/' + art + '.png"><span class="role" aria-hidden="true">' + symbol + '</span>';
        label += ', ' + (piece.color === 'w' ? 'твоя фигура' : 'соперник') + ', ' + name + ', ' + role;
      }
      const target = options.find(m => m.to === square);
      if (target) {
        button.classList.add('move');
        button.classList.toggle('capture', Boolean(target.captured));
        label += ', можно пойти';
      }
      button.setAttribute('aria-label', label);
      button.onclick = () => tapSquare(square, target);
      board.append(button);
    }
  }
  get('board').replaceChildren(board);
  const ended = game.isGameOver();
  const status = get('status');
  const hint = get('hint');
  hint.replaceChildren();
  if (ended) {
    status.textContent = game.isCheckmate() ? (game.turn() === 'b' ? 'Ты победил!' : 'Мат. Победа соперника') : 'Ничья';
    const again = document.createElement('button');
    again.textContent = 'Сыграть ещё';
    again.onclick = restart;
    hint.append(again);

  } else if (game.turn() === 'b') {
    status.textContent = 'Ход соперника…';
  } else {
    status.textContent = game.isCheck() ? 'Шах! Твой ход' : 'Твой ход';
    const piece = selected && game.get(selected);
    if (piece) {
      const [, name, role,, instruction] = identity(piece.type,piece.color);
      hint.textContent = name + ' · ' + role + '. ' + (options.length ? instruction : 'Сейчас нет ходов.');
    } else if (!game.history().length) hint.textContent = 'Коснись своего покемона';
  }
}
async function play(input) {
  if (moving || !inGame) return;
  moving = true;
  get('menu-button').disabled = true;
  const move = game.move(input);
  get('status').textContent = move.color === 'w' ? 'Твой покемон ходит…' : 'Соперник ходит…';
  selected = null;
  if (game.isGameOver() && !done) {
    record(profile, game, gameId);
    done = true;
  }
  persist();
  try { await animateMove(get('board'), move); }
  finally {
    moving = false;
    get('menu-button').disabled = false;
    render();
    if (move.captured && !done) {
      const winner = identity(move.piece,move.color)[1];
      const defeated = identity(move.captured,move.color === 'w' ? 'b' : 'w')[1];
      get('hint').textContent = winner + ' ⚔ ' + defeated + (move.color === 'w' ? ' · Твой покемон победил!' : ' · Победа соперника!');
    }
    scheduleBot();
  }
}
function tapSquare(square,target) {
  if (moving || !inGame || game.isGameOver()) return;
  if (target) {
    if (target.promotion) {
      pendingPromotion = {from:selected,to:square};
      get('promotion').showModal();
    } else play({from:selected,to:square});
    return;
  }
  selected = null;
  const piece = game.get(square);
  if (piece?.color === 'w' && game.turn() === 'w') selected = square;
  render();
  if (piece && !selected) {
    const [,name,role] = identity(piece.type,piece.color);
    get('hint').textContent = name + ' · ' + role;
  }
}
for (const type of ['q','r','n','b']) {
  const choice = roleEntry(type,'button');
  choice.dataset.type = type;
  choice.onclick = () => {
    get('promotion').close();
    play({...pendingPromotion, promotion:type});
    pendingPromotion = null;
  };
  get('choices').append(choice);
}
const weights = {p:100,n:315,b:325,r:500,q:900,k:0};
function chooseReply() {
  let best, high = -Infinity;
  for (const move of game.moves({verbose:true})) {
    game.move(move);
    const replies = game.moves({verbose:true});
    const risk = Math.max(0,...replies.map(reply => weights[reply.captured] || 0));
    let score = (weights[move.captured] || 0) - risk * 0.85 + Math.random() * 32;
    if (move.promotion) score += weights[move.promotion] - weights.p;
    if (game.isCheck()) score += replies.length ? 25 : 100000;
    game.undo();
    if (score > high) { high = score; best = move; }
  }
  return best;
}
function scheduleBot() {
  clearTimeout(botTimer);
  if (inGame && game.turn() === 'b' && !game.isGameOver()) {
    botTimer = setTimeout(() => play(chooseReply()), 400);
  }
}
function restart() {
  clearTimeout(botTimer);
  game = new Chess();
  gameId = crypto.randomUUID();
  done = false;
  selected = null;
  render();
  persist();
}
let editingRole = 'k';
function drawCatalog() {
  const tabs = get('role-tabs'), roster = get('roster');
  tabs.replaceChildren();
  roster.replaceChildren();
  for (const [type,role] of Object.entries(roles)) {
    const tab = document.createElement('button');
    tab.textContent = role[3] + ' ' + role[2];
    tab.setAttribute('aria-pressed',String(type === editingRole));
    tab.onclick = () => { editingRole = type; drawCatalog(); };
    tabs.append(tab);
  }
  for (const [art,name] of Object.entries(names)) {
    const button = document.createElement('button');
    const current = Object.keys(profile.team).find(type => profile.team[type] === art);
    button.className = 'monster';
    button.setAttribute('aria-pressed',String(current === editingRole));
    button.innerHTML = '<img src="art/'+art+'.png" alt=""><b>'+name+'</b><small>'+(current ? roles[current][2] : 'В запасе')+'</small>';
    button.onclick = () => {
      const swapped = assign(profile.team,editingRole,art);
      persist();
      drawCatalog();
      if (swapped) get('team-note').textContent += ' ' + roles[swapped][2] + ' — ' + names[profile.team[swapped]] + '.';
    };
    roster.append(button);
  }
  get('team-note').textContent = roles[editingRole][2] + ' — ' + names[profile.team[editingRole]] + '.';
}
function showHome() {
  clearTimeout(botTimer);
  inGame = false;
  document.querySelector('main').hidden = true;
  get('menu-button').hidden = true;
  get('home').hidden = false;
  get('username').value = profile.name;
  for (const field of ['wins','losses','points']) get(field).textContent = profile[field];
  const underway = game.history().length > 0 && !game.isGameOver();
  get('enter').textContent = underway ? 'Продолжить партию' : 'Играть';
  get('restart').hidden = !underway;
  const rows = profile.history.map(entry => {
    const row = document.createElement('li');
    row.textContent = new Date(entry.date).toLocaleDateString('ru') + ' · ' + entry.name + ' · ' + entry.result + ' · +' + entry.points;
    return row;
  });
  get('history').replaceChildren(...rows);
  if (!rows.length) get('history').textContent = 'Здесь появятся завершённые партии.';
}
function enter() {
  if (game.isGameOver()) restart();
  inGame = true;
  get('home').hidden = true;
  get('menu-button').hidden = false;
  document.querySelector('main').hidden = false;
  get('player-name').textContent = profile.name;
  for (const button of get('choices').children) button.innerHTML = roleEntry(button.dataset.type).innerHTML;
  render();
  scheduleBot();
}
get('username').oninput = event => {
  profile.name = event.target.value.trim() || 'George';
  persist();
};
get('username').onblur = event => { event.target.value = profile.name; };
get('enter').onclick = enter;
get('menu-button').onclick = showHome;
get('catalog-button').onclick = () => { drawCatalog(); get('catalog').showModal(); };
get('help').onclick = () => {
  get('legend').replaceChildren(...Object.keys(roles).map(type => roleEntry(type)));
  get('guide').showModal();
};
document.querySelectorAll('.close').forEach(button => {
  button.onclick = () => button.closest('dialog').close();
});
get('restart').onclick = () => get('reset').showModal();
get('confirm-reset').onclick = () => { get('reset').close(); restart(); enter(); };
showHome();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
