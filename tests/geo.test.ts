import { describe, expect, it } from 'vitest';
import { distanceMeters, formatHemisphere, isValidLatLng, parseCoordinates } from '../src/lib/geo';

describe('parseCoordinates', () => {
  it('reads comma and space separated pairs', () => {
    expect(parseCoordinates('6.9271, 79.8612')).toEqual({ lat: 6.9271, lng: 79.8612 });
    expect(parseCoordinates('  -33.8688 151.2093 ')).toEqual({ lat: -33.8688, lng: 151.2093 });
  });
  it('reads hemisphere letters', () => {
    expect(parseCoordinates('33.86°S 151.2°E')).toEqual({ lat: -33.86, lng: 151.2 });
    expect(parseCoordinates('40.7 N, 74.0 W')).toEqual({ lat: 40.7, lng: -74 });
  });
  it('rejects out-of-range and non-coordinate text', () => {
    expect(parseCoordinates('95, 10')).toBeNull();
    expect(parseCoordinates('10, 190')).toBeNull();
    expect(parseCoordinates('Negombo')).toBeNull();
  });
});

describe('helpers', () => {
  it('validates ranges', () => {
    expect(isValidLatLng(90, 180)).toBe(true);
    expect(isValidLatLng(NaN, 0)).toBe(false);
  });
  it('formats hemispheres', () => {
    expect(formatHemisphere({ lat: -1.5, lng: -2.25 }, 2)).toEqual({ lat: '1.50° S', lng: '2.25° W' });
  });
  it('measures distance', () => {
    const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(Math.round(d / 1000)).toBe(111);
  });
});
