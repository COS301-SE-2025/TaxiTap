#!/usr/bin/env node

/**
 * TaxiTap Test Data Generator
 * Generates realistic test data for South African taxi operations
 */

const fs = require('fs');
const path = require('path');

// South African cities with realistic coordinates
const cities = [
  {
    name: 'Johannesburg',
    center: { lat: -26.2041, lng: 28.0473 },
    radius: 0.1,
    popularRoutes: [
      { from: 'Sandton City', to: 'Rosebank', fromCoords: { lat: -26.1073, lng: 28.0567 }, toCoords: { lat: -26.1467, lng: 28.0433 } },
      { from: 'OR Tambo Airport', to: 'Sandton', fromCoords: { lat: -26.1337, lng: 28.2423 }, toCoords: { lat: -26.1073, lng: 28.0567 } },
      { from: 'Melville', to: 'CBD', fromCoords: { lat: -26.1847, lng: 28.0100 }, toCoords: { lat: -26.2041, lng: 28.0473 } }
    ]
  },
  {
    name: 'Cape Town',
    center: { lat: -33.9249, lng: 18.4241 },
    radius: 0.08,
    popularRoutes: [
      { from: 'V&A Waterfront', to: 'Green Point', fromCoords: { lat: -33.9056, lng: 18.4211 }, toCoords: { lat: -33.9180, lng: 18.4241 } },
      { from: 'Cape Town Airport', to: 'City Bowl', fromCoords: { lat: -33.9648, lng: 18.6017 }, toCoords: { lat: -33.9249, lng: 18.4241 } },
      { from: 'Sea Point', to: 'CBD', fromCoords: { lat: -33.9180, lng: 18.3900 }, toCoords: { lat: -33.9249, lng: 18.4241 } }
    ]
  },
  {
    name: 'Durban',
    center: { lat: -29.8587, lng: 31.0218 },
    radius: 0.06,
    popularRoutes: [
      { from: 'Gateway Theatre', to: 'Umhlanga', fromCoords: { lat: -29.8587, lng: 31.0218 }, toCoords: { lat: -29.7280, lng: 31.0880 } },
      { from: 'Durban Airport', to: 'CBD', fromCoords: { lat: -29.6144, lng: 31.1197 }, toCoords: { lat: -29.8587, lng: 31.0218 } },
      { from: 'Florida Road', to: 'Beachfront', fromCoords: { lat: -29.8300, lng: 31.0100 }, toCoords: { lat: -29.8587, lng: 31.0218 } }
    ]
  }
];

// Sample names for realistic test data
const passengerNames = [
  'Thabo Mthembu', 'Nomsa Dlamini', 'Sipho Nkosi', 'Lerato Molefe', 'Mandla Khumalo',
  'Zanele Mthembu', 'Bongani Dube', 'Ntombi Ndlovu', 'Sibusiso Mthembu', 'Thandiwe Mkhize',
  'Mpho Nkomo', 'Nomsa Zulu', 'Sipho Mthembu', 'Lerato Dlamini', 'Mandla Nkosi',
  'Zanele Molefe', 'Bongani Khumalo', 'Ntombi Mthembu', 'Sibusiso Dube', 'Thandiwe Ndlovu'
];

const driverNames = [
  'John Mthembu', 'Mary Dlamini', 'Peter Nkosi', 'Sarah Molefe', 'David Khumalo',
  'Grace Mthembu', 'Michael Dube', 'Linda Ndlovu', 'Robert Mthembu', 'Susan Mkhize',
  'James Nkomo', 'Patricia Zulu', 'William Mthembu', 'Elizabeth Dlamini', 'Richard Nkosi',
  'Jennifer Molefe', 'Charles Khumalo', 'Margaret Mthembu', 'Thomas Dube', 'Dorothy Ndlovu'
];

// Generate random coordinates within a city
function generateRandomCoordinates(city) {
  const lat = city.center.lat + (Math.random() - 0.5) * city.radius;
  const lng = city.center.lng + (Math.random() - 0.5) * city.radius;
  return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
}

// Generate realistic fare based on distance
function generateFare(distance) {
  const baseFare = 15; // Minimum fare
  const perKmRate = 8; // Rate per kilometer
  const distanceKm = distance * 111; // Rough conversion to km
  return Math.round((baseFare + (distanceKm * perKmRate)) * 100) / 100;
}

// Generate test data
function generateTestData(count = 1000) {
  const testData = [];
  
  for (let i = 0; i < count; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const route = city.popularRoutes[Math.floor(Math.random() * city.popularRoutes.length)];
    
    // Generate random variations of the route
    const startCoords = {
      lat: route.fromCoords.lat + (Math.random() - 0.5) * 0.01,
      lng: route.fromCoords.lng + (Math.random() - 0.5) * 0.01
    };
    
    const endCoords = {
      lat: route.toCoords.lat + (Math.random() - 0.5) * 0.01,
      lng: route.toCoords.lng + (Math.random() - 0.5) * 0.01
    };
    
    // Calculate distance for fare estimation
    const distance = Math.sqrt(
      Math.pow(endCoords.lat - startCoords.lat, 2) + 
      Math.pow(endCoords.lng - startCoords.lng, 2)
    );
    
    const passengerName = passengerNames[Math.floor(Math.random() * passengerNames.length)];
    const driverName = driverNames[Math.floor(Math.random() * driverNames.length)];
    
    testData.push({
      passengerId: `user_${String(i + 1).padStart(3, '0')}`,
      driverId: `driver_${String(i + 1).padStart(3, '0')}`,
      passengerName: passengerName,
      driverName: driverName,
      startLat: startCoords.lat,
      startLng: startCoords.lng,
      endLat: endCoords.lat,
      endLng: endCoords.lng,
      startAddress: route.from,
      endAddress: route.to,
      city: city.name,
      estimatedFare: generateFare(distance),
      estimatedDistance: parseFloat(distance.toFixed(2)),
      estimatedDuration: Math.floor(Math.random() * 30 + 10) // 10-40 minutes
    });
  }
  
  return testData;
}

// Generate CSV data for JMeter
function generateCSVData(testData) {
  const csvHeader = 'passengerId,driverId,startLat,startLng,endLat,endLng,startAddress,endAddress,estimatedFare,estimatedDistance\n';
  const csvRows = testData.map(data => 
    `${data.passengerId},${data.driverId},${data.startLat},${data.startLng},${data.endLat},${data.endLng},"${data.startAddress}","${data.endAddress}",${data.estimatedFare},${data.estimatedDistance}`
  ).join('\n');
  
  return csvHeader + csvRows;
}

// Generate JSON data for K6 and Artillery
function generateJSONData(testData) {
  return JSON.stringify(testData, null, 2);
}

// Generate SQL insert statements
function generateSQLData(testData) {
  const sqlStatements = testData.map(data => {
    return `INSERT INTO test_rides (passenger_id, driver_id, start_lat, start_lng, end_lat, end_lng, start_address, end_address, estimated_fare, estimated_distance, city) VALUES ('${data.passengerId}', '${data.driverId}', ${data.startLat}, ${data.startLng}, ${data.endLat}, ${data.endLng}, '${data.startAddress}', '${data.endAddress}', ${data.estimatedFare}, ${data.estimatedDistance}, '${data.city}');`;
  });
  
  return sqlStatements.join('\n');
}

// Generate location update data
function generateLocationUpdateData(count = 500) {
  const locationData = [];
  
  for (let i = 0; i < count; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const coords = generateRandomCoordinates(city);
    
    locationData.push({
      userId: `driver_${String(i + 1).padStart(3, '0')}`,
      latitude: coords.lat,
      longitude: coords.lng,
      role: 'driver',
      city: city.name,
      timestamp: Date.now() + (i * 1000) // Spread timestamps
    });
  }
  
  return locationData;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 1000;
  const outputDir = args[1] || './generated_data';
  
  console.log(`Generating ${count} test records...`);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate test data
  const testData = generateTestData(count);
  const locationData = generateLocationUpdateData(Math.floor(count / 2));
  
  // Generate CSV for JMeter
  const csvData = generateCSVData(testData);
  fs.writeFileSync(path.join(outputDir, 'test_data.csv'), csvData);
  console.log(`✅ Generated CSV data: ${outputDir}/test_data.csv`);
  
  // Generate JSON for K6/Artillery
  const jsonData = generateJSONData(testData);
  fs.writeFileSync(path.join(outputDir, 'test_data.json'), jsonData);
  console.log(`✅ Generated JSON data: ${outputDir}/test_data.json`);
  
  // Generate location data
  const locationJsonData = generateJSONData(locationData);
  fs.writeFileSync(path.join(outputDir, 'location_data.json'), locationJsonData);
  console.log(`✅ Generated location data: ${outputDir}/location_data.json`);
  
  // Generate SQL for database setup
  const sqlData = generateSQLData(testData);
  fs.writeFileSync(path.join(outputDir, 'test_data.sql'), sqlData);
  console.log(`✅ Generated SQL data: ${outputDir}/test_data.sql`);
  
  // Generate summary report
  const summary = {
    generatedAt: new Date().toISOString(),
    totalRecords: count,
    cities: cities.map(c => c.name),
    dataTypes: ['CSV', 'JSON', 'SQL', 'Location Updates'],
    files: [
      'test_data.csv',
      'test_data.json', 
      'location_data.json',
      'test_data.sql'
    ]
  };
  
  fs.writeFileSync(path.join(outputDir, 'generation_summary.json'), JSON.stringify(summary, null, 2));
  console.log(`✅ Generated summary: ${outputDir}/generation_summary.json`);
  
  // Print statistics
  console.log('\n📊 Generation Statistics:');
  console.log(`   Total Records: ${count}`);
  console.log(`   Cities Covered: ${cities.length}`);
  console.log(`   Location Updates: ${locationData.length}`);
  console.log(`   Average Fare: R${(testData.reduce((sum, d) => sum + d.estimatedFare, 0) / count).toFixed(2)}`);
  console.log(`   Average Distance: ${(testData.reduce((sum, d) => sum + d.estimatedDistance, 0) / count).toFixed(2)} km`);
  
  console.log('\n🎯 Test Data Ready!');
  console.log('   Use the generated files with your performance testing tools:');
  console.log('   - JMeter: Use test_data.csv');
  console.log('   - K6: Use test_data.json');
  console.log('   - Artillery: Use location_data.json');
  console.log('   - Database: Use test_data.sql');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateTestData,
  generateCSVData,
  generateJSONData,
  generateSQLData,
  generateLocationUpdateData
};
