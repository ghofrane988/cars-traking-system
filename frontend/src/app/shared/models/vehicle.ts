export interface Vehicle {
  id?: number;
  marque: string;
  modele: string;
  matricule: string;
  annee?: number;
  statut: 'Disponible' | 'En maintenance' | 'Affecté';
  latitude?: number;
  longitude?: number;
  // Fuel consumption (L/100km)
  consommation?: number;
  assurance_date?: string;
  visite_technique_date?: string;
  vignette_date?: string;
  type_carburant?: 'Essence' | 'Diesel' | 'Électrique' | 'Hybride';
  capacite_reservoir?: number;
  // Mileage tracking
  km_actuel?: number;
  created_at?: Date;
  updated_at?: Date;
}

// Helper function to calculate fuel needed
export function calculateFuelNeeded(distanceKm: number, consumptionLPer100km: number): number {
  if (!distanceKm || !consumptionLPer100km) return 0;
  return Math.round((distanceKm * consumptionLPer100km / 100) * 10) / 10;
}

// Helper function to check if vehicle has enough fuel
export function hasEnoughFuel(vehicle: Vehicle, distanceKm: number): boolean {
  if (!vehicle.consommation || !vehicle.capacite_reservoir) return true;
  const fuelNeeded = calculateFuelNeeded(distanceKm, vehicle.consommation);
  // Assume tank is half full if no current fuel level available
  const currentFuel = (vehicle.capacite_reservoir / 2);
  return currentFuel >= fuelNeeded;
}
