export function buildBookingComReservationUrl(input: {
  reservationId: string;
  hotelId: string;
}): string | null {
  const reservationId = input.reservationId.trim();
  const hotelId = input.hotelId.trim();
  if (!reservationId || !hotelId) {
    return null;
  }

  const url = new URL(
    'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html'
  );
  url.searchParams.set('res_id', reservationId);
  url.searchParams.set('hotel_id', hotelId);
  return url.toString();
}
