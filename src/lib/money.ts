// Money arrives from the API as integer kobo (₦1 = 100 kobo). Formatted by hand rather
// than with Intl so it looks the same on every device: ₦175,000 or ₦1,250.50.

export function formatMoney(kobo: number): string {
  const sign = kobo < 0 ? '-' : '';
  const abs = Math.abs(Math.round(kobo));
  const naira = Math.floor(abs / 100);
  const rest = abs % 100;
  const grouped = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₦${grouped}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}
