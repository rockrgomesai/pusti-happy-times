/**
 * Mock Location Service for Testing GPS Tracking
 * Simulates realistic movement patterns without physical movement
 */

import {LocationPoint} from './locationService';

export interface MockRoute {
  name: string;
  coordinates: [number, number][]; // [lat, lng]
  speedKmh?: number; // Average speed in km/h
}

// Predefined test routes in Dhaka
export const MOCK_ROUTES: {[key: string]: MockRoute} = {
  // Short route around Gulshan area
  GULSHAN_LOOP: {
    name: 'Gulshan Area Loop',
    coordinates: [
      [23.7808, 90.4163], // Gulshan Circle 1
      [23.7850, 90.4170], // Moving north
      [23.7890, 90.4200], // Gulshan Avenue
      [23.7920, 90.4220], // Near Banani
      [23.7900, 90.4180], // Coming back
      [23.7850, 90.4165], // Returning
      [23.7808, 90.4163], // Back to start
    ],
    speedKmh: 20, // 20 km/h average
  },

  // Longer route across city
  DHAKA_COMMUTE: {
    name: 'Dhaka City Commute',
    coordinates: [
      [23.8103, 90.4125], // Mirpur
      [23.8050, 90.4100], 
      [23.7950, 90.4080],
      [23.7850, 90.4120],
      [23.7750, 90.4150], // Mohakhali
      [23.7650, 90.4180],
      [23.7550, 90.4200], // Tejgaon
      [23.7450, 90.4180],
      [23.7350, 90.4150], // Motijheel area
    ],
    speedKmh: 15, // Slower due to traffic
  },

  // Very short route for quick testing
  QUICK_TEST: {
    name: 'Quick Test Route',
    coordinates: [
      [23.8103, 90.4125],
      [23.8110, 90.4130],
      [23.8115, 90.4135],
      [23.8120, 90.4138],
    ],
    speedKmh: 30,
  },
};

class MockLocationService {
  private intervalId: NodeJS.Timeout | null = null;
  private currentIndex: number = 0;
  private coordinates: [number, number][] = [];
  private speedKmh: number = 20;
  private onLocationCallback?: (point: LocationPoint) => void;

  /**
   * Start simulating movement along a predefined route
   */
  startMockTracking(
    routeKey: keyof typeof MOCK_ROUTES,
    callback?: (point: LocationPoint) => void,
  ): void {
    const route = MOCK_ROUTES[routeKey];
    this.coordinates = route.coordinates;
    this.speedKmh = route.speedKmh || 20;
    this.onLocationCallback = callback;
    this.currentIndex = 0;

    console.log(`🧪 Mock tracking started: ${route.name}`);
    console.log(`📍 Total waypoints: ${this.coordinates.length}`);
    console.log(`🚗 Speed: ${this.speedKmh} km/h`);

    // Calculate interval based on speed
    // Update every 5 seconds for smoother animation
    const updateIntervalMs = 5000;

    this.intervalId = setInterval(() => {
      if (this.currentIndex >= this.coordinates.length) {
        console.log('✅ Mock route completed');
        this.stopMockTracking();
        return;
      }

      const [latitude, longitude] = this.coordinates[this.currentIndex];
      const point: LocationPoint = {
        latitude,
        longitude,
        timestamp: Date.now(),
        accuracy: 10 + Math.random() * 5, // Simulate GPS accuracy variation
      };

      console.log(
        `📍 Mock point ${this.currentIndex + 1}/${this.coordinates.length}: [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`,
      );

      if (this.onLocationCallback) {
        this.onLocationCallback(point);
      }

      this.currentIndex++;
    }, updateIntervalMs);
  }

  /**
   * Start custom route with your own coordinates
   */
  startCustomMockRoute(
    coordinates: [number, number][],
    speedKmh: number = 20,
    callback?: (point: LocationPoint) => void,
  ): void {
    this.coordinates = coordinates;
    this.speedKmh = speedKmh;
    this.onLocationCallback = callback;
    this.currentIndex = 0;

    console.log('🧪 Custom mock tracking started');
    console.log(`📍 Total waypoints: ${coordinates.length}`);

    const updateIntervalMs = 5000;

    this.intervalId = setInterval(() => {
      if (this.currentIndex >= this.coordinates.length) {
        this.stopMockTracking();
        return;
      }

      const [latitude, longitude] = this.coordinates[this.currentIndex];
      const point: LocationPoint = {
        latitude,
        longitude,
        timestamp: Date.now(),
        accuracy: 10 + Math.random() * 5,
      };

      if (this.onLocationCallback) {
        this.onLocationCallback(point);
      }

      this.currentIndex++;
    }, updateIntervalMs);
  }

  /**
   * Simulate random walk from current position
   * Good for testing continuous tracking
   */
  startRandomWalk(
    startLat: number,
    startLng: number,
    steps: number = 20,
    maxStepKm: number = 0.05, // 50 meters max per step
    callback?: (point: LocationPoint) => void,
  ): void {
    let currentLat = startLat;
    let currentLng = startLng;
    let stepCount = 0;

    this.onLocationCallback = callback;

    console.log('🧪 Random walk started');
    console.log(`📍 Starting point: [${startLat}, ${startLng}]`);

    this.intervalId = setInterval(() => {
      if (stepCount >= steps) {
        console.log('✅ Random walk completed');
        this.stopMockTracking();
        return;
      }

      // Random direction and distance
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * maxStepKm;

      // Convert km to degrees (approximate)
      const latChange = (distance * Math.cos(angle)) / 111; // 1 degree lat ≈ 111 km
      const lngChange =
        (distance * Math.sin(angle)) / (111 * Math.cos(currentLat * (Math.PI / 180)));

      currentLat += latChange;
      currentLng += lngChange;

      const point: LocationPoint = {
        latitude: currentLat,
        longitude: currentLng,
        timestamp: Date.now(),
        accuracy: 10 + Math.random() * 10,
      };

      console.log(`🚶 Step ${stepCount + 1}/${steps}: [${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}]`);

      if (this.onLocationCallback) {
        this.onLocationCallback(point);
      }

      stepCount++;
    }, 5000);
  }

  /**
   * Stop mock tracking
   */
  stopMockTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Mock tracking stopped');
    }
  }

  /**
   * Check if currently tracking
   */
  isTracking(): boolean {
    return this.intervalId !== null;
  }
}

export const mockLocationService = new MockLocationService();
export default mockLocationService;
