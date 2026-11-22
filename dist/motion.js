export async function animateMove(board, move) {
  const cell = square => board.querySelector('[data-square="' + square + '"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animations = [];
  function animate(node, frames, duration, delay = 0) {
    if (!node?.animate) return;
    animations.push(node.animate(frames,{duration,delay,fill:'forwards',easing:'ease-out'}));
  }
  function travel(from, to) {
    const source = cell(from), dest = cell(to);
    const a = source.getBoundingClientRect(), b = dest.getBoundingClientRect();
    source.classList.add('flying');
    const x = b.left - a.left, y = b.top - a.top;
    animate(source.querySelector('img'),[
      {transform:'translate(0,0)'},
      {transform:'translate('+x*.6+'px,'+(y*.6-a.height*.22)+'px) scale(1.12)',offset:.6},
      {transform:'translate('+x+'px,'+y+'px)'}
    ],move.captured ? 390 : 300);
  }
  if (!reduced) {
    travel(move.from,move.to);
    if (move.isKingsideCastle() || move.isQueensideCastle()) {
      const rank = move.from[1], right = move.isKingsideCastle();
      travel((right?'h':'a')+rank,(right?'f':'d')+rank);
    }
  }
  if (move.captured) {
    const victim = cell(move.isEnPassant() ? move.to[0]+move.from[1] : move.to);
    const star = document.createElement('span');
    star.className = 'battle-star';
    star.setAttribute('aria-hidden','true');
    star.textContent = '✦';
    victim.append(star);
    animate(star,reduced ? [{opacity:0},{opacity:.8},{opacity:0}] : [
      {opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1.35) rotate(-15deg)',offset:.35},{opacity:0,transform:'scale(1.65) rotate(16deg)'}
    ],reduced?140:420,reduced?0:190);
    animate(victim.querySelector('img'),reduced ? [{opacity:1},{opacity:0}] : [
      {opacity:1,transform:'scale(1)'},{opacity:1,transform:'rotate(-12deg) scale(.9)',filter:'brightness(1.75)'},{opacity:0,transform:'translateY(-15%) scale(.35)'}
    ],reduced?140:300,reduced?0:220);
  }
  await Promise.allSettled(animations.map(a=>a.finished));
}
