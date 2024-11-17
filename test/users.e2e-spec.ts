import * as request from 'supertest';
import { TestSetup } from './test-setup';
import { CreateUserDto } from '../src/modules/users/dto/create-user.dto';

describe('UsersController (e2e)', () => {
    let testSetup: TestSetup;
    let authToken: string;

    beforeAll(async () => {
        testSetup = await new TestSetup().initialize();
    });

    afterAll(async () => {
        await testSetup.close();
    });

    beforeEach(async () => {
        await testSetup.cleanupDatabase();

        // Créer un utilisateur et obtenir le token pour les tests
        const createUserDto: CreateUserDto = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
        };

        await request(testSetup.app.getHttpServer())
            .post('/api/auth/register')
            .send(createUserDto);

        const loginResponse = await request(testSetup.app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: createUserDto.email,
                password: createUserDto.password,
            });

        authToken = loginResponse.body.access_token;
    });

    describe('GET /users', () => {
        it('should get all users', async () => {
            const response = await request(testSetup.app.getHttpServer())
                .get('/api/users')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBeGreaterThan(0);
        });
    });

    describe('GET /users/:id', () => {
        it('should get user by id', async () => {
            // Créer un autre utilisateur
            const createUserDto: CreateUserDto = {
                email: 'another@example.com',
                password: 'password123',
                name: 'Another User',
            };

            const createResponse = await request(testSetup.app.getHttpServer())
                .post('/api/auth/register')
                .send(createUserDto);

            const userId = createResponse.body.id;

            const response = await request(testSetup.app.getHttpServer())
                .get(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.id).toBe(userId);
            expect(response.body.email).toBe(createUserDto.email);
        });
    });
});