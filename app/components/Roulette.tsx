// components/Roulette.js
import { useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';

export default function Roulette({ game, phase }) {
  const rouletteRef = useRef(null);

  const RADIUS = 90;
  const CENTER_X = 150;
  const CENTER_Y = 150;

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const initRoulette = () => {
    const $roulette = rouletteRef.current;
    if (!$roulette) return;

    // Clear existing children
    while ($roulette.firstChild) {
      $roulette.removeChild($roulette.firstChild);
    }

    // Add the center ball
    const ball = document.createElement('div');
    ball.className = styles.ball;
    $roulette.appendChild(ball);

    if (!game.deposits || game.deposits.length === 0) {
      $roulette.style.background = '#333';
      return;
    }

    // Assign colors if not already present
    game.deposits.forEach((deposit) => {
      if (!deposit.color) deposit.color = getRandomColor();
    });

    let startAngle = 0;
    const gradientStops = [];

    game.deposits.forEach((deposit) => {
      const percentage = (deposit.amount / game.balance) * 100;
      const sliceAngle = (percentage / 100) * 360;
      const endAngle = startAngle + sliceAngle;
      gradientStops.push(`${deposit.color} ${startAngle}deg ${endAngle}deg`);

      const midAngle = startAngle + sliceAngle / 2;
      const angleRad = (midAngle - 90) * (Math.PI / 180);
      const x = CENTER_X + RADIUS * 0.7 * Math.cos(angleRad);
      const y = CENTER_Y + RADIUS * 0.7 * Math.sin(angleRad);

      const label = document.createElement('div');
      label.className = styles.sliceLabel;
      label.textContent = `...${deposit.wallet.slice(-4)}`;
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.style.transform = `translate(-50%, -50%) rotate(${-midAngle}deg)`;
      $roulette.appendChild(label);

      deposit.startAngle = startAngle;
      deposit.endAngle = endAngle;
      startAngle = endAngle;
    });

    const gradientCSS = `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
    $roulette.style.background = gradientCSS;
    $roulette.style.transform = 'rotate(0deg)';
  };

  const spinRoulette = () => {
    if (!game.winner || !game.deposits || game.deposits.length === 0) return;

    const winnerDeposit = game.deposits.find((deposit) => deposit.wallet === game.winner);
    if (!winnerDeposit) return;

    const winnerAngle = (winnerDeposit.startAngle + winnerDeposit.endAngle) / 2;
    const randomOffset = (Math.random() - 0.5) * (winnerDeposit.endAngle - winnerDeposit.startAngle);

    const rotations = 360 * 5;
    const finalAngle = rotations - (winnerAngle + randomOffset);

    const duration = 3000;
    const startAngle = 0;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentAngle = startAngle + (finalAngle - startAngle) * easeOutCubic(progress);

      const $roulette = rouletteRef.current;
      $roulette.style.transform = `rotate(${currentAngle}deg)`;
      Array.from($roulette.getElementsByClassName(styles.sliceLabel)).forEach((label) => {
        const originalTransform = label.style.transform.match(/translate\([^)]+\)/)?.[0] || 'translate(-50%, -50%)';
        label.style.transform = `${originalTransform} rotate(${-currentAngle}deg)`;
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  useEffect(() => {
    initRoulette();
  }, [game.deposits, game.balance]);

  useEffect(() => {
    if (phase === 'ended' && game.winner) {
      spinRoulette();
    }
  }, [phase, game.winner]);

  return (
    <div className={styles.rouletteContainer}>
      <div className={styles.roulette} ref={rouletteRef}></div>
      {game.winner && phase === 'ended' && (
        <h2 className={styles.winner}>
          Winner: ...{game.winner.slice(-4)}
        </h2>
      )}
    </div>
  );
}