export function playCompletionSound() {
  try {
    const soundKey = localStorage.getItem('planlizz-sound') || 'pop';
    if (soundKey === 'none') return;

    const soundMap: Record<string, string> = {
      arrow: '/sounds/Flecha.m4a',
      bark: '/sounds/Latido.m4a',
      birds: '/sounds/Passaros.mp3',
      correctDing: '/sounds/Correto.m4a',
      ding: '/sounds/Ding.m4a',
      meow: '/sounds/Gatinho.m4a',
      pop: '/sounds/Pop.m4a',
      successDing: '/sounds/Conquista.m4a',
      whistle: '/sounds/Apito.m4a',
    };

    const file = soundMap[soundKey];
    if (file) {
      const audio = new Audio(file);
      audio.play().catch(() => {});
    }
  } catch {
    // Silently fail
  }
}

export function playSuccessSound() {
  try {
    const audio = new Audio('/sounds/Conquista.m4a');
    audio.play().catch(() => {});
  } catch {
    // Silently fail
  }
}

export function playTimerStartSound() {
  try {
    const audio = new Audio('/sounds/Ding.m4a');
    audio.play().catch(() => {});
  } catch {
    // Silently fail
  }
}
