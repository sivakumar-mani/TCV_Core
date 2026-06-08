const https = require('https');

let locationCache = null;
const locationUrl = 'https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json';
const districtOverrides = {
  'Tamil Nadu': [
    'Ariyalur',
    'Chengalpattu',
    'Chennai',
    'Coimbatore',
    'Cuddalore',
    'Dharmapuri',
    'Dindigul',
    'Erode',
    'Kallakurichi',
    'Kanchipuram',
    'Kanyakumari',
    'Karur',
    'Krishnagiri',
    'Madurai',
    'Mayiladuthurai',
    'Nagapattinam',
    'Namakkal',
    'Nilgiris',
    'Perambalur',
    'Pudukkottai',
    'Ramanathapuram',
    'Ranipet',
    'Salem',
    'Sivaganga',
    'Tenkasi',
    'Thanjavur',
    'Theni',
    'Thoothukudi',
    'Tiruchirappalli',
    'Tirunelveli',
    'Tirupathur',
    'Tiruppur',
    'Tiruvallur',
    'Tiruvannamalai',
    'Tiruvarur',
    'Vellore',
    'Viluppuram',
    'Virudhunagar'
  ]
};

const requestJson = (url) => new Promise((resolve, reject) => {
  https
    .get(url, {
      agent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TCV-Core/1.0'
      }
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    })
    .on('error', reject);
});

const getLocationData = async () => {
  if (locationCache) return locationCache;
  const data = await requestJson(locationUrl);
  locationCache = (data.states || []).map((state) => ({
    ...state,
    districts: districtOverrides[state.state] || state.districts || []
  }));
  return locationCache;
};

const getStates = async (req, res) => {
  try {
    const states = await getLocationData();
    return res.json(states.map((state, index) => ({
      state_id: index + 1,
      state_name: state.state
    })));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch states',
      error: error.message
    });
  }
};

const getDistricts = async (req, res) => {
  try {
    const { state_id } = req.params;
    const states = await getLocationData();
    const state = states[Number(state_id) - 1];

    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    return res.json((state.districts || []).map((district, index) => ({
      district_id: index + 1,
      district_name: district
    })));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch districts',
      error: error.message
    });
  }
};

module.exports = { getStates, getDistricts };
