const axios = require('axios');
const request = require('supertest');
const {createApp, closeApp} = require('../../app');
const db = require('../../utils/database');
const { generateMockUserRoute } = require('../../utils/generators');

describe('/generate-presigned-url endpoints', () => {
    let app, mockUser, testUser, authData, userDetails;

    beforeAll(async () => {
        app = await createApp();

        mockUser = await generateMockUserRoute();
        let serviceUrl = process.env.AUTH_SERVER_URL + '/v1/register';

        let response = await axios.post(serviceUrl, mockUser);
        const userId = response.data.userId;
        // Get the test user from the database
        testUser = await db.getUserByUserId(userId);
        var user = { username: testUser.username, activationCode: testUser.activation_code };
        await db.activateUser(user);

        serviceUrl = process.env.AUTH_SERVER_URL + '/v1/login';

        response = await axios.post(serviceUrl, { usernameOrEmail: mockUser.username, password: mockUser.password });

        authData = response.data;
            
    });

    // Ensure the app resources are closed after all tests
    afterAll(async () => {
        await db.deleteUserByUsername(mockUser.username);
        await closeApp();
    });

    it('GET /generate-presigned-url should generate a valid presigned URL', async () => {
        const res = await request(app)
            .get('/v1/generate-presigned-url')
            .query({ fileName: 'test.jpg', fileType: 'image/jpeg', fileSize:1024, domain: 1, countryISOCode: 'ca' })
            .set('Authorization', `Bearer ${authData.token}`);
    
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('presignedUrl');
        expect(res.body).toHaveProperty('exp');
    });    

});