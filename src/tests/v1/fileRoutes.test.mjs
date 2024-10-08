import axios from 'axios';
import http from 'http';
import https from 'https';
import request from 'supertest';
import { getUserByUserId } from '../../utils/database.mjs';
import { generateMockUserRoute } from '../../utils/generators.mjs';

describe('/generate-presigned-url endpoints', () => {

    const app = global.__APP__;

    let mockUser, authData;

    const headers = {
        'x-development-token': process.env.X_DEVELOPMENT_TOKEN,
    };

    const axiosInstance = axios.create({
        httpAgent: new http.Agent({ keepAlive: false }),
        httpsAgent: new https.Agent({ keepAlive: false }),
    });

    beforeAll(async () => {

        mockUser = await generateMockUserRoute();
        console.log(mockUser);
        let response = await axiosInstance.post(`${process.env.AUTH_SERVER_URL}/v1/register`, mockUser, { headers });
        console.log(response.data);
        const userId = response.data.userId;
        // Get the test user from the database
        const testUser = await getUserByUserId(userId);
        const inactiveUser = { username: testUser.username, activationCode: testUser.activation_code };
        console.log(inactiveUser);
        await axiosInstance.post(`${process.env.AUTH_SERVER_URL}/v1/activate-by-code`, inactiveUser, { headers });
        const user = { usernameOrEmail: mockUser.username, password: mockUser.password };
        response = await axiosInstance.post(`${process.env.AUTH_SERVER_URL}/v1/login`, user, { headers });

        authData = response.data;
    });

    afterAll(async () => {
        try {
            headers['Authorization'] = `Bearer ${authData.token}`;
            await axiosInstance.delete(`${process.env.AUTH_SERVER_URL}/v1/deregister`, { headers });
        } catch (error) {
            console.error('Error during deregister:', error);
        } finally {
            // Explicitly destroy the agents to close any open sockets
            if (axiosInstance.defaults.httpAgent) {
                axiosInstance.defaults.httpAgent.destroy();
            }
            if (axiosInstance.defaults.httpsAgent) {
                axiosInstance.defaults.httpsAgent.destroy();
            }
        }
    });

    it('GET /generate-presigned-url should generate a valid presigned URL', async () => {
        const res = await request(app)
            .get('/v1/generate-presigned-post-url')
            .set(headers)
            .set('Authorization', `Bearer ${authData.token}`)
            .query({ fileName: 'test.jpg', fileType: 'image/jpeg', fileSize:1024, domain: 1, countryISOCode: 'ca' });
    
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('presignedUrl');
        expect(res.body).toHaveProperty('exp');
    });    

});