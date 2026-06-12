const connection = require('../connection');
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

// Get all states (from database)
const getStatesFromDB = async (req, res) => {
  try {
    const [states] = await connection.promise().query(
      'SELECT state_id, state_code, state_name FROM states WHERE is_active = 1 ORDER BY state_name'
    );
    return res.json(states);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get districts by state_id (from database)
const getDistrictsByStateDB = async (req, res) => {
  try {
    const { state_id } = req.params;

    if (!state_id) {
      return res.status(400).json({ success: false, message: 'state_id is required' });
    }

    const [districts] = await connection.promise().query(
      'SELECT district_id, district_name FROM districts WHERE state_id = ? AND is_active = 1 ORDER BY district_name',
      [state_id]
    );

    return res.json(districts);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all states with districts (from database)
const getStatesWithDistrictsDB = async (req, res) => {
  try {
    const [states] = await connection.promise().query(
      `SELECT s.state_id, s.state_code, s.state_name, 
              JSON_ARRAYAGG(JSON_OBJECT('district_id', d.district_id, 'district_name', d.district_name)) as districts
       FROM states s
       LEFT JOIN districts d ON s.state_id = d.state_id AND d.is_active = 1
       WHERE s.is_active = 1
       GROUP BY s.state_id, s.state_code, s.state_name
       ORDER BY s.state_name`
    );
    return res.json(states);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get list of ID proof types (for dropdown)
const getIdProofTypes = async (req, res) => {
  const idProofTypes = [
    { code: 'AADHAAR', name: 'Aadhar' },
    { code: 'PAN', name: 'PAN Card' },
    { code: 'VOTER_ID', name: 'Voter ID' },
    { code: 'PASSPORT', name: 'Passport' },
    { code: 'DRIVING_LICENSE', name: 'Driving License' },
    { code: 'RATION_CARD', name: 'Ration Card' },
    { code: 'NREGA_JOB_CARD', name: 'NREGA Job Card' },
    { code: 'BANK_PASSBOOK', name: 'Bank Passbook' },
    { code: 'POST_OFFICE_PASSBOOK', name: 'Post Office Passbook' },
    { code: 'GOVERNMENT_EMPLOYEE_ID', name: 'Government Employee ID' },
    { code: 'DEFENCE_ID', name: 'Defence ID' },
    { code: 'PENSIONER_CARD', name: 'Pensioner Card' },
    { code: 'BIRTH_CERTIFICATE', name: 'Birth Certificate' },
    { code: 'OTHER', name: 'Other' }
  ];

  return res.json(idProofTypes);
};

// Get list of departments
const getDepartments = async (req, res) => {
  const departments = [
    { code: 'ADMIN', name: 'Admin' },
    { code: 'SALES', name: 'Sales' },
    { code: 'PURCHASE', name: 'Purchase' },
    { code: 'STORE', name: 'Store' },
    { code: 'INSTALLATION', name: 'Installation' },
    { code: 'SERVICE', name: 'Service' },
    { code: 'ACCOUNTS', name: 'Accounts' }
  ];

  return res.json(departments);
};

// Legacy API methods (using external source)
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

module.exports = { 
  getStates,
  getDistricts,
  getStatesFromDB,
  getDistrictsByStateDB,
  getStatesWithDistrictsDB,
  getIdProofTypes,
  getDepartments
};
