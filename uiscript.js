
 const darkButton =document.querySelector('#darkmode').addEventListener('click', function() {
      document.getElementsByTagName('body')[0].classList.toggle('dark');
       });


const pointer = document.querySelector('.pointer');
let currentX = window.innerWidth / 2;
let currentY = window.innerHeight / 2;
let targetX = currentX;
let targetY = currentY;
let isIdle = false;
let idleTimeout;
const MIN_TRAIL_DISTANCE = 8;

document.addEventListener('mousemove', (e) => {
  targetX = e.clientX;
  targetY = e.clientY;

  isIdle = false;
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    isIdle = true;
  }, 50);
});

function animate() {
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  currentX += dx * 0.2;
  currentY += dy * 0.2;

  pointer.style.left = `${currentX}px`;
  pointer.style.top = `${currentY}px`;

  if (isIdle || distance < MIN_TRAIL_DISTANCE) {
    pointer.style.transform = `translate(-50%, -50%)`;
    pointer.style.width = `12px`;
    pointer.style.height = `12px`;
    pointer.style.borderRadius = `50%`;
    pointer.style.background = `#ff9800`;
  } else {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    pointer.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    pointer.style.width = `${20 + Math.min(distance, 40)}px`;
    pointer.style.height = `10px`;
    pointer.style.borderRadius = `5px`;
    pointer.style.background = `linear-gradient(to left, #ff9800, transparent)`;
  }

  requestAnimationFrame(animate);
}

animate();