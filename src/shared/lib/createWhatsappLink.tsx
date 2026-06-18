const createWhatsappLink = (phone: string, message: string): string => {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
};
export { createWhatsappLink };
