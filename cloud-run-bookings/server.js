const express = require('express');
const {google} = require('googleapis');

const app = express();
app.use(express.json());

// Add CORS support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

function loadSecrets() {
  // Read from environment variables (Cloud Run)
  const oauthEnv = process.env.OAUTH_JSON;
  const calEnv = process.env.CAL_IDS_JSON;

  if (!oauthEnv || !calEnv) {
    throw new Error('Missing required environment variables: OAUTH_JSON and CAL_IDS_JSON');
  }

  try {
    const oauth = JSON.parse(oauthEnv);
    const calendars = JSON.parse(calEnv);
    return {oauth, calendars};
  } catch (error) {
    throw new Error(`Failed to parse environment variables: ${error.message}`);
  }
}

function getAuthClient(oauth) {
  const oAuth2Client = new google.auth.OAuth2(oauth.client_id, oauth.client_secret);
  oAuth2Client.setCredentials({refresh_token: oauth.refresh_token});
  return oAuth2Client;
}

app.get('/health', (req, res) => res.json({ok: true}));

// Test endpoint
app.post('/bookings/test', async (req, res) => {
  try {
    const {oauth, calendars} = loadSecrets();
    const auth = getAuthClient(oauth);
    const calendar = google.calendar({version: 'v3', auth});

    const now = new Date();
    const end = new Date(now.getTime() + 30 * 60000);
    const payload = {
      summary: 'API Test Booking',
      description: 'Automated test event',
      start: {dateTime: now.toISOString()},
      end: {dateTime: end.toISOString()},
    };

    const results = {};
    for (const [group, ids] of Object.entries(calendars)) {
      if (group === 'userEmail') continue;
      for (const [name, calId] of Object.entries(ids)) {
        const resp = await calendar.events.insert({calendarId: calId, requestBody: payload});
        results[`${group}.${name}`] = resp.data.id;
      }
    }

    res.json({ok: true, results});
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ok: false, error: error.message});
  }
});

// Test Ride Booking endpoint
app.post('/bookings/test-ride', async (req, res) => {
  try {
    const {oauth, calendars} = loadSecrets();
    const auth = getAuthClient(oauth);
    const calendar = google.calendar({version: 'v3', auth});

    const {
      test_ride_location,
      test_ride_date,
      test_ride_time,
      experience_level,
      customer_name,
      customer_email,
      customer_phone,
      ride_length,
      special_requests,
      product_title,
      product_handle
    } = req.body;

    // Determine which calendar to use based on location
    let calendarId;
    if (test_ride_location.includes('Lugano')) {
      calendarId = calendars.testRide.lugano;
    } else if (test_ride_location.includes('Bellinzona')) {
      calendarId = calendars.testRide.bellinzona;
    } else if (test_ride_location.includes('Locarno')) {
      calendarId = calendars.testRide.locarno;
    } else if (test_ride_location.includes('Zurich')) {
      calendarId = calendars.testRide.zurich;
    } else {
      throw new Error('Invalid location selected');
    }

    // Create calendar event
    const startDateTime = new Date(`${test_ride_date}T${test_ride_time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour default

    const event = {
      summary: `Test Ride: ${customer_name}`,
      description: `Test Ride Booking\n\nCustomer: ${customer_name}\nEmail: ${customer_email}\nPhone: ${customer_phone}\nExperience: ${experience_level}\nDuration: ${ride_length}\nProduct: ${product_title || 'N/A'}\nSpecial Requests: ${special_requests || 'None'}`,
      start: {dateTime: startDateTime.toISOString()},
      end: {dateTime: endDateTime.toISOString()},
      location: test_ride_location,
      attendees: [{email: customer_email}],
      reminders: {
        useDefault: false,
        overrides: [
          {method: 'email', minutes: 24 * 60}, // 24 hours before
          {method: 'popup', minutes: 60} // 1 hour before
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendUpdates: 'all'
    });

    res.json({
      success: true,
      booking_id: response.data.id,
      message: 'Test ride booked successfully'
    });

  } catch (error) {
    console.error('Test ride booking error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Service/Workshop Booking endpoint
app.post('/bookings/service', async (req, res) => {
  try {
    const {oauth, calendars} = loadSecrets();
    const auth = getAuthClient(oauth);
    const calendar = google.calendar({version: 'v3', auth});

    const {
      service_location,
      workshop_type,
      workshop_date,
      workshop_time,
      participants,
      special_requirements,
      customer_name,
      customer_email,
      customer_phone,
      workshop_duration
    } = req.body;

    // Determine which calendar to use based on location
    let calendarId;
    if (service_location.includes('Lugano')) {
      calendarId = calendars.service.lugano;
    } else if (service_location.includes('Bellinzona')) {
      calendarId = calendars.service.bellinzona;
    } else if (service_location.includes('Locarno')) {
      calendarId = calendars.service.locarno;
    } else if (service_location.includes('Zurich')) {
      calendarId = calendars.service.zurich;
    } else {
      throw new Error('Invalid location selected');
    }

    // Create calendar event
    const startDateTime = new Date(`${workshop_date}T${workshop_time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour default

    const event = {
      summary: `Service: ${workshop_type} - ${customer_name}`,
      description: `Service Booking\n\nCustomer: ${customer_name}\nEmail: ${customer_email}\nPhone: ${customer_phone}\nService: ${workshop_type}\nBikes: ${participants}\nDuration: ${workshop_duration || '1 hour'}\nSpecial Requirements: ${special_requirements || 'None'}`,
      start: {dateTime: startDateTime.toISOString()},
      end: {dateTime: endDateTime.toISOString()},
      location: service_location,
      attendees: [{email: customer_email}],
      reminders: {
        useDefault: false,
        overrides: [
          {method: 'email', minutes: 24 * 60}, // 24 hours before
          {method: 'popup', minutes: 60} // 1 hour before
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendUpdates: 'all'
    });

    res.json({
      success: true,
      booking_id: response.data.id,
      message: 'Service appointment booked successfully'
    });

  } catch (error) {
    console.error('Service booking error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Bookings API listening on ${port}`));
