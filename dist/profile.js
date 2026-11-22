export const defaults = {p:'pikachu',n:'ponyta',r:'squirtle',b:'alakazam',q:'gardevoir',k:'snorlax'};
export const names = {
  pikachu:'Пикачу', ponyta:'Понита', squirtle:'Сквиртл', alakazam:'Алаказам',
  gardevoir:'Гардевуар', snorlax:'Снорлакс', charizard:'Чаризард', eevee:'Иви',
  bulbasaur:'Бульбазавр', gengar:'Генгар'
};
export function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
export function initialProfile(legacy = {}) {
  return {name:'George', points:Number(legacy.xp)||0, wins:Number(legacy.wins)||0, losses:0, history:[], team:{...defaults}};
}
export function assign(team, role, monster) {
  const other = Object.keys(team).find(key => team[key] === monster);
  if (other) team[other] = team[role];
  team[role] = monster;
  return other !== role && other;
}
export function record(profile, game, id) {
  if (!game.isGameOver() || profile.history.some(entry => entry.id === id)) return;
  let result = 'Ничья', points = 20;
  if (game.isCheckmate()) {
    const win = game.turn() === 'b';
    result = win ? 'Победа' : 'Поражение';
    points = win ? 100 : 0;
    profile[win ? 'wins' : 'losses']++;
  }
  profile.points += points;
  profile.history.unshift({id,name:profile.name,date:Date.now(),result,points});
}
