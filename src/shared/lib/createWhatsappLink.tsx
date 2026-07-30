const createWhatsappLink = (phone: string, message: string): string => {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
};

/** Bare WhatsApp chat link (no prefilled text). Returns null when phone has no digits. */
function buildWhatsappMeHref(phone: string): string | null {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

export { createWhatsappLink, buildWhatsappMeHref };
