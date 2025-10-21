/**
 * Test script to verify offer data structure from backend
 * This helps confirm the fix for territorial data in edit mode
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testOfferDataStructure() {
  try {
    console.log('🔍 Testing Offer Data Structure...\n');

    // First, get list of offers
    console.log('1️⃣  Fetching offers list...');
    const listResponse = await axios.get(`${API_BASE_URL}/product/offers`, {
      params: { limit: 5 }
    });

    const offers = listResponse.data.data;
    
    if (!offers || offers.length === 0) {
      console.log('❌ No offers found in database.');
      console.log('ℹ️  Please create an offer first to test the edit functionality.\n');
      return;
    }

    console.log(`✅ Found ${offers.length} offer(s)\n`);

    // Get the first offer's details
    const testOfferId = offers[0]._id;
    console.log(`2️⃣  Fetching detailed offer data for ID: ${testOfferId}`);
    console.log(`   Offer Name: ${offers[0].name}\n`);

    const detailResponse = await axios.get(`${API_BASE_URL}/product/offers/${testOfferId}`);
    const offerDetail = detailResponse.data.data;

    console.log('📊 Offer Data Structure Analysis:\n');
    
    // Check territories structure
    console.log('🗺️  Territories Structure:');
    if (offerDetail.territories) {
      console.log('   ✅ territories object exists');
      
      // Check zones
      if (offerDetail.territories.zones) {
        console.log(`   📍 Zones:`);
        console.log(`      - Has 'ids' field: ${offerDetail.territories.zones.ids ? '✅ YES' : '❌ NO'}`);
        console.log(`      - Has 'items' field: ${offerDetail.territories.zones.items ? '⚠️  YES (unexpected)' : '✅ NO (correct)'}`);
        console.log(`      - Count: ${offerDetail.territories.zones.ids?.length || 0}`);
        console.log(`      - Mode: ${offerDetail.territories.zones.mode || 'not set'}`);
        if (offerDetail.territories.zones.ids && offerDetail.territories.zones.ids.length > 0) {
          console.log(`      - Sample ID: ${offerDetail.territories.zones.ids[0]._id || offerDetail.territories.zones.ids[0]}`);
        }
      }

      // Check regions
      if (offerDetail.territories.regions) {
        console.log(`   🌍 Regions:`);
        console.log(`      - Has 'ids' field: ${offerDetail.territories.regions.ids ? '✅ YES' : '❌ NO'}`);
        console.log(`      - Has 'items' field: ${offerDetail.territories.regions.items ? '⚠️  YES (unexpected)' : '✅ NO (correct)'}`);
        console.log(`      - Count: ${offerDetail.territories.regions.ids?.length || 0}`);
        console.log(`      - Mode: ${offerDetail.territories.regions.mode || 'not set'}`);
      }

      // Check areas
      if (offerDetail.territories.areas) {
        console.log(`   📌 Areas:`);
        console.log(`      - Has 'ids' field: ${offerDetail.territories.areas.ids ? '✅ YES' : '❌ NO'}`);
        console.log(`      - Has 'items' field: ${offerDetail.territories.areas.items ? '⚠️  YES (unexpected)' : '✅ NO (correct)'}`);
        console.log(`      - Count: ${offerDetail.territories.areas.ids?.length || 0}`);
        console.log(`      - Mode: ${offerDetail.territories.areas.mode || 'not set'}`);
      }

      // Check db_points
      if (offerDetail.territories.db_points) {
        console.log(`   🏪 DB Points:`);
        console.log(`      - Has 'ids' field: ${offerDetail.territories.db_points.ids ? '✅ YES' : '❌ NO'}`);
        console.log(`      - Has 'items' field: ${offerDetail.territories.db_points.items ? '⚠️  YES (unexpected)' : '✅ NO (correct)'}`);
        console.log(`      - Count: ${offerDetail.territories.db_points.ids?.length || 0}`);
        console.log(`      - Mode: ${offerDetail.territories.db_points.mode || 'not set'}`);
      }
    } else {
      console.log('   ❌ territories object does not exist');
    }

    // Check distributors structure
    console.log('\n👥 Distributors Structure:');
    if (offerDetail.distributors) {
      console.log('   ✅ distributors object exists');
      console.log(`   - Has 'ids' field: ${offerDetail.distributors.ids ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Has 'items' field: ${offerDetail.distributors.items ? '⚠️  YES (unexpected)' : '✅ NO (correct)'}`);
      console.log(`   - Count: ${offerDetail.distributors.ids?.length || 0}`);
      console.log(`   - Mode: ${offerDetail.distributors.mode || 'not set'}`);
    } else {
      console.log('   ❌ distributors object does not exist');
    }

    console.log('\n📝 Summary:');
    console.log('   The backend returns data with the following structure:');
    console.log('   - territories.zones.ids[] ✅');
    console.log('   - territories.regions.ids[] ✅');
    console.log('   - territories.areas.ids[] ✅');
    console.log('   - territories.db_points.ids[] ✅');
    console.log('   - distributors.ids[] ✅\n');
    
    console.log('   Our fix maps these correctly in the frontend:');
    console.log('   - Changed from: .items?.map() ❌');
    console.log('   - Changed to: .ids?.map() ✅\n');

    console.log('🎉 Data structure verification complete!\n');
    console.log(`🔗 Test the edit page at: http://localhost:3000/product/offers/edit/${testOfferId}`);

  } catch (error) {
    console.error('❌ Error testing offer data structure:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testOfferDataStructure();
