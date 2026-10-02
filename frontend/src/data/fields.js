// Central definition of every field the POST /predict API expects.
// Field names must stay exactly as defined here — the backend validates them.

export const MODEL_NAME = "CatBoost Native + Engineered Features";
export const THRESHOLD = 0.57;

export const OPTIONS = {
  region_code: ["C1","C10","C11","C12","C13","C14","C15","C16","C17","C18","C19","C2","C20","C21","C22","C3","C4","C5","C6","C7","C8","C9"],
  segment: ["A", "B1", "B2", "C1", "C2", "Utility"],
  model: ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11"],
  fuel_type: ["CNG", "Diesel", "Petrol"],
  engine_type: ["1.0 SCe","1.2 L K Series Engine","1.2 L K12N Dualjet","1.5 L U2 CRDi","1.5 Turbocharged Revotorq","1.5 Turbocharged Revotron","F8D Petrol Engine","G12B","K Series Dual jet","K10C","i-DTEC"],
  rear_brakes_type: ["Disc", "Drum"],
  transmission_type: ["Automatic", "Manual"],
  steering_type: ["Electric", "Manual", "Power"],
};

// Numeric ranges observed in the training data.
export const RANGES = {
  subscription_length: { min: 0, max: 14, label: "Subscription Length", desc: "Years the customer has been insured", placeholder: "9.3" },
  vehicle_age: { min: 0, max: 20, label: "Vehicle Age", desc: "Age of the vehicle in years", placeholder: "1.2" },
  customer_age: { min: 35, max: 75, label: "Customer Age", desc: "Age of the policy holder", placeholder: "41" },
  region_density: { min: 290, max: 73430, label: "Region Density", desc: "Population density of the region", placeholder: "8794" },
  airbags: { min: 1, max: 6, label: "Airbags", desc: "Total airbags fitted", placeholder: "6" },
  displacement: { min: 796, max: 1498, label: "Displacement", desc: "Engine size in cc", unit: "cc", placeholder: "1493" },
  cylinder: { min: 3, max: 4, label: "Cylinder", desc: "Number of engine cylinders", placeholder: "4" },
  turning_radius: { min: 4.5, max: 5.2, label: "Turning Radius", desc: "Minimum turning circle in metres", unit: "m", step: "0.01", placeholder: "5.2" },
  length: { min: 3445, max: 4300, label: "Length", desc: "Vehicle length in mm", unit: "mm", placeholder: "4300" },
  width: { min: 1475, max: 1811, label: "Width", desc: "Vehicle width in mm", unit: "mm", placeholder: "1790" },
  gross_weight: { min: 1051, max: 1720, label: "Gross Weight", desc: "Vehicle weight in kg", unit: "kg", placeholder: "1720" },
  ncap_rating: { min: 0, max: 5, label: "NCAP Rating", desc: "Crash safety rating, 0 to 5 stars", placeholder: "3" },
  torque_nm: { min: 50, max: 260, label: "Torque", desc: "Peak engine torque", unit: "Nm", placeholder: "250" },
  torque_rpm: { min: 1500, max: 4500, label: "Torque RPM", desc: "Engine speed at peak torque", unit: "rpm", placeholder: "2750" },
  power_bhp: { min: 30, max: 130, label: "Power", desc: "Peak engine power", unit: "bhp", step: "0.01", placeholder: "113.45" },
  power_rpm: { min: 3000, max: 6500, label: "Power RPM", desc: "Engine speed at peak power", unit: "rpm", placeholder: "4000" },
};

export const INITIAL_VALUES = {
  subscription_length: 9.3,
  vehicle_age: 1.2,
  customer_age: 41,
  region_code: "C8",
  region_density: 8794,
  segment: "C2",
  model: "M4",
  fuel_type: "Diesel",
  engine_type: "1.5 L U2 CRDi",
  airbags: 6,
  is_esc: "Yes",
  is_adjustable_steering: "Yes",
  is_tpms: "Yes",
  is_parking_sensors: "Yes",
  is_parking_camera: "Yes",
  rear_brakes_type: "Disc",
  displacement: 1493,
  cylinder: 4,
  transmission_type: "Automatic",
  steering_type: "Power",
  turning_radius: 5.2,
  length: 4300,
  width: 1790,
  gross_weight: 1720,
  is_front_fog_lights: "Yes",
  is_rear_window_wiper: "Yes",
  is_rear_window_washer: "Yes",
  is_rear_window_defogger: "Yes",
  is_brake_assist: "Yes",
  is_power_door_locks: "Yes",
  is_central_locking: "Yes",
  is_power_steering: "Yes",
  is_driver_seat_height_adjustable: "Yes",
  is_day_night_rear_view_mirror: "No",
  is_ecw: "Yes",
  is_speed_alert: "Yes",
  ncap_rating: 3,
  torque_nm: 250,
  torque_rpm: 2750,
  power_bhp: 113.45,
  power_rpm: 4000,
};

// Short display labels for the Yes/No safety equipment fields.
export const SAFETY_FIELDS = [
  { key: "is_esc", label: "ESC", desc: "Electronic stability control" },
  { key: "is_adjustable_steering", label: "Adjustable Steering", desc: "Adjustable steering column" },
  { key: "is_tpms", label: "TPMS", desc: "Tyre pressure monitoring" },
  { key: "is_parking_sensors", label: "Parking Sensors", desc: "Rear obstacle sensors" },
  { key: "is_parking_camera", label: "Parking Camera", desc: "Rear view camera" },
  { key: "is_front_fog_lights", label: "Front Fog Lights", desc: "Fog lamps fitted" },
  { key: "is_rear_window_wiper", label: "Rear Window Wiper", desc: "Rear wiper fitted" },
  { key: "is_rear_window_washer", label: "Rear Window Washer", desc: "Rear washer fitted" },
  { key: "is_rear_window_defogger", label: "Rear Window Defogger", desc: "Rear defogger fitted" },
  { key: "is_brake_assist", label: "Brake Assist", desc: "Emergency brake assist" },
  { key: "is_power_door_locks", label: "Power Door Locks", desc: "Power operated locks" },
  { key: "is_central_locking", label: "Central Locking", desc: "Central locking system" },
  { key: "is_power_steering", label: "Power Steering", desc: "Power assisted steering" },
  { key: "is_driver_seat_height_adjustable", label: "Driver Seat Height Adjustable", desc: "Height adjustable seat" },
  { key: "is_day_night_rear_view_mirror", label: "Day/Night Rear View Mirror", desc: "Anti-glare mirror" },
  { key: "is_ecw", label: "ECW", desc: "Emergency call warning" },
  { key: "is_speed_alert", label: "Speed Alert", desc: "Over-speed alert system" },
];

export const BINARY_KEYS = SAFETY_FIELDS.map((f) => f.key);

const CATEGORICAL_KEYS = [
  "region_code",
  "segment",
  "model",
  "fuel_type",
  "engine_type",
  "rear_brakes_type",
  "transmission_type",
  "steering_type",
  ...BINARY_KEYS,
];

export function validate(values) {
  const errors = {};

  CATEGORICAL_KEYS.forEach((key) => {
    if (!values[key] && values[key] !== 0) errors[key] = "This field is required.";
  });

  Object.entries(RANGES).forEach(([key, { min, max }]) => {
    const raw = values[key];
    if (raw === "" || raw === null || raw === undefined) {
      errors[key] = "This field is required.";
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) {
      errors[key] = "Enter a valid number.";
    } else if (num < min || num > max) {
      errors[key] = `Must be between ${min} and ${max}.`;
    }
  });

  return errors;
}

/** Build the exact API payload: numeric strings become real numbers. */
export function toPayload(values) {
  const payload = { ...values };
  Object.keys(RANGES).forEach((key) => {
    payload[key] = Number(values[key]);
  });
  return payload;
}
