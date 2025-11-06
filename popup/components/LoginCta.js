export function LoginCta(onClick) {
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Continue with Google';
  btn.addEventListener('click', () => {
    if (onClick) onClick();
    else {
      // dispatch a custom event so host can show a toast
      const e = new CustomEvent('sp:auth-click');
      window.dispatchEvent(e);
    }
  });
  return btn;
}
