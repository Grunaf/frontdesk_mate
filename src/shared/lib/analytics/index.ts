export { AnalyticsProvider } from './AnalyticsProvider';
export { LandingViewTracker } from './LandingViewTracker';
export { getPostHogHost, getPostHogKey, isAnalyticsEnabled } from './config';
export {
  trackBookingWhatsappClick,
  trackCheckInSuccess,
  trackLandingView,
  trackReceptionContactClick,
} from './events';
export type {
  AnalyticsEventName,
  AnalyticsSite,
  BookingWhatsappPlacement,
  ReceptionContactChannel,
  ReceptionContactContext,
} from './types';
