/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as functions_locations_createLocation from "../functions/locations/createLocation.js";
import type * as functions_locations_getNearbyTaxis from "../functions/locations/getNearbyTaxis.js";
import type * as functions_locations_getNearbyTaxisOnRoute from "../functions/locations/getNearbyTaxisOnRoute.js";
import type * as functions_locations_updateUserLocation from "../functions/locations/updateUserLocation.js";
import type * as functions_locations_updateUserLocationHandler from "../functions/locations/updateUserLocationHandler.js";
import type * as functions_notifications_deactivatePushToken from "../functions/notifications/deactivatePushToken.js";
import type * as functions_notifications_getNotificationSettings from "../functions/notifications/getNotificationSettings.js";
import type * as functions_notifications_getNotifications from "../functions/notifications/getNotifications.js";
import type * as functions_notifications_markAllAsRead from "../functions/notifications/markAllAsRead.js";
import type * as functions_notifications_markAsRead from "../functions/notifications/markAsRead.js";
import type * as functions_notifications_registerPushToken from "../functions/notifications/registerPushToken.js";
import type * as functions_notifications_rideNotifications from "../functions/notifications/rideNotifications.js";
import type * as functions_notifications_sendNotifications from "../functions/notifications/sendNotifications.js";
import type * as functions_notifications_updateNotificationSettings from "../functions/notifications/updateNotificationSettings.js";
import type * as functions_rides_RequestRide from "../functions/rides/RequestRide.js";
import type * as functions_rides_RequestRideHandler from "../functions/rides/RequestRideHandler.js";
import type * as functions_rides_acceptRide from "../functions/rides/acceptRide.js";
import type * as functions_rides_acceptRideHandler from "../functions/rides/acceptRideHandler.js";
import type * as functions_rides_cancelRide from "../functions/rides/cancelRide.js";
import type * as functions_rides_cancelRideHandler from "../functions/rides/cancelRideHandler.js";
import type * as functions_rides_completeRide from "../functions/rides/completeRide.js";
import type * as functions_rides_completeRideHandler from "../functions/rides/completeRideHandler.js";
import type * as functions_rides_declineRide from "../functions/rides/declineRide.js";
import type * as functions_rides_declineRideHandler from "../functions/rides/declineRideHandler.js";
import type * as functions_rides_endRide from "../functions/rides/endRide.js";
import type * as functions_rides_endRideHandler from "../functions/rides/endRideHandler.js";
import type * as functions_rides_getRideById from "../functions/rides/getRideById.js";
import type * as functions_rides_startRide from "../functions/rides/startRide.js";
import type * as functions_routes_calculateRoute from "../functions/routes/calculateRoute.js";
import type * as functions_routes_displayRoutes from "../functions/routes/displayRoutes.js";
import type * as functions_routes_enhancedTaxiMatching from "../functions/routes/enhancedTaxiMatching.js";
import type * as functions_routes_insertRoute_internal from "../functions/routes/insertRoute_internal.js";
import type * as functions_routes_mutations from "../functions/routes/mutations.js";
import type * as functions_routes_queries from "../functions/routes/queries.js";
import type * as functions_routes_reverseGeocode from "../functions/routes/reverseGeocode.js";
import type * as functions_taxis_displayTaxis from "../functions/taxis/displayTaxis.js";
import type * as functions_taxis_getTaxiForDriver from "../functions/taxis/getTaxiForDriver.js";
import type * as functions_taxis_getTaxiForDriverHandler from "../functions/taxis/getTaxiForDriverHandler.js";
import type * as functions_taxis_updateAvailableSeats from "../functions/taxis/updateAvailableSeats.js";
import type * as functions_taxis_updateAvailableSeatsHandler from "../functions/taxis/updateAvailableSeatsHandler.js";
import type * as functions_taxis_updateTaxiInfo from "../functions/taxis/updateTaxiInfo.js";
import type * as functions_taxis_updateTaxiInfoHandler from "../functions/taxis/updateTaxiInfoHandler.js";
import type * as functions_taxis_viewTaxiInfo from "../functions/taxis/viewTaxiInfo.js";
import type * as functions_taxis_viewTaxiInfoHandler from "../functions/taxis/viewTaxiInfoHandler.js";
import type * as functions_users_UserManagement_getUserById from "../functions/users/UserManagement/getUserById.js";
import type * as functions_users_UserManagement_logInWithSMS from "../functions/users/UserManagement/logInWithSMS.js";
import type * as functions_users_UserManagement_signUpWithSMS from "../functions/users/UserManagement/signUpWithSMS.js";
import type * as functions_users_UserManagement_switchActiveRole from "../functions/users/UserManagement/switchActiveRole.js";
import type * as functions_users_UserManagement_switchBothtoDriver from "../functions/users/UserManagement/switchBothtoDriver.js";
import type * as functions_users_UserManagement_switchBothtoPassenger from "../functions/users/UserManagement/switchBothtoPassenger.js";
import type * as functions_users_UserManagement_switchDrivertoBoth from "../functions/users/UserManagement/switchDrivertoBoth.js";
import type * as functions_users_UserManagement_switchPassengertoBoth from "../functions/users/UserManagement/switchPassengertoBoth.js";
import type * as functions_users_UserManagement_updateHomeAddress from "../functions/users/UserManagement/updateHomeAddress.js";
import type * as functions_users_UserManagement_updateUserProfile from "../functions/users/UserManagement/updateUserProfile.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "functions/locations/createLocation": typeof functions_locations_createLocation;
  "functions/locations/getNearbyTaxis": typeof functions_locations_getNearbyTaxis;
  "functions/locations/getNearbyTaxisOnRoute": typeof functions_locations_getNearbyTaxisOnRoute;
  "functions/locations/updateUserLocation": typeof functions_locations_updateUserLocation;
  "functions/locations/updateUserLocationHandler": typeof functions_locations_updateUserLocationHandler;
  "functions/notifications/deactivatePushToken": typeof functions_notifications_deactivatePushToken;
  "functions/notifications/getNotificationSettings": typeof functions_notifications_getNotificationSettings;
  "functions/notifications/getNotifications": typeof functions_notifications_getNotifications;
  "functions/notifications/markAllAsRead": typeof functions_notifications_markAllAsRead;
  "functions/notifications/markAsRead": typeof functions_notifications_markAsRead;
  "functions/notifications/registerPushToken": typeof functions_notifications_registerPushToken;
  "functions/notifications/rideNotifications": typeof functions_notifications_rideNotifications;
  "functions/notifications/sendNotifications": typeof functions_notifications_sendNotifications;
  "functions/notifications/updateNotificationSettings": typeof functions_notifications_updateNotificationSettings;
  "functions/rides/RequestRide": typeof functions_rides_RequestRide;
  "functions/rides/RequestRideHandler": typeof functions_rides_RequestRideHandler;
  "functions/rides/acceptRide": typeof functions_rides_acceptRide;
  "functions/rides/acceptRideHandler": typeof functions_rides_acceptRideHandler;
  "functions/rides/cancelRide": typeof functions_rides_cancelRide;
  "functions/rides/cancelRideHandler": typeof functions_rides_cancelRideHandler;
  "functions/rides/completeRide": typeof functions_rides_completeRide;
  "functions/rides/completeRideHandler": typeof functions_rides_completeRideHandler;
  "functions/rides/declineRide": typeof functions_rides_declineRide;
  "functions/rides/declineRideHandler": typeof functions_rides_declineRideHandler;
  "functions/rides/endRide": typeof functions_rides_endRide;
  "functions/rides/endRideHandler": typeof functions_rides_endRideHandler;
  "functions/rides/getRideById": typeof functions_rides_getRideById;
  "functions/rides/startRide": typeof functions_rides_startRide;
  "functions/routes/calculateRoute": typeof functions_routes_calculateRoute;
  "functions/routes/displayRoutes": typeof functions_routes_displayRoutes;
  "functions/routes/enhancedTaxiMatching": typeof functions_routes_enhancedTaxiMatching;
  "functions/routes/insertRoute_internal": typeof functions_routes_insertRoute_internal;
  "functions/routes/mutations": typeof functions_routes_mutations;
  "functions/routes/queries": typeof functions_routes_queries;
  "functions/routes/reverseGeocode": typeof functions_routes_reverseGeocode;
  "functions/taxis/displayTaxis": typeof functions_taxis_displayTaxis;
  "functions/taxis/getTaxiForDriver": typeof functions_taxis_getTaxiForDriver;
  "functions/taxis/getTaxiForDriverHandler": typeof functions_taxis_getTaxiForDriverHandler;
  "functions/taxis/updateAvailableSeats": typeof functions_taxis_updateAvailableSeats;
  "functions/taxis/updateAvailableSeatsHandler": typeof functions_taxis_updateAvailableSeatsHandler;
  "functions/taxis/updateTaxiInfo": typeof functions_taxis_updateTaxiInfo;
  "functions/taxis/updateTaxiInfoHandler": typeof functions_taxis_updateTaxiInfoHandler;
  "functions/taxis/viewTaxiInfo": typeof functions_taxis_viewTaxiInfo;
  "functions/taxis/viewTaxiInfoHandler": typeof functions_taxis_viewTaxiInfoHandler;
  "functions/users/UserManagement/getUserById": typeof functions_users_UserManagement_getUserById;
  "functions/users/UserManagement/logInWithSMS": typeof functions_users_UserManagement_logInWithSMS;
  "functions/users/UserManagement/signUpWithSMS": typeof functions_users_UserManagement_signUpWithSMS;
  "functions/users/UserManagement/switchActiveRole": typeof functions_users_UserManagement_switchActiveRole;
  "functions/users/UserManagement/switchBothtoDriver": typeof functions_users_UserManagement_switchBothtoDriver;
  "functions/users/UserManagement/switchBothtoPassenger": typeof functions_users_UserManagement_switchBothtoPassenger;
  "functions/users/UserManagement/switchDrivertoBoth": typeof functions_users_UserManagement_switchDrivertoBoth;
  "functions/users/UserManagement/switchPassengertoBoth": typeof functions_users_UserManagement_switchPassengertoBoth;
  "functions/users/UserManagement/updateHomeAddress": typeof functions_users_UserManagement_updateHomeAddress;
  "functions/users/UserManagement/updateUserProfile": typeof functions_users_UserManagement_updateUserProfile;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
