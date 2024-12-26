import * as request from 'supertest';
import { TestSetup } from './test-setup';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';

describe('AuthController (e2e)', () => {
  let testSetup: TestSetup;

  beforeAll(async () => {
    testSetup = await new TestSetup().initialize();
  });

  afterAll(async () => {
    await testSetup.close();
  });

  beforeEach(async () => {
    await testSetup.cleanupDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(testSetup.app.getHttpServer())
        .post('/api/auth/register')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('POST /auth/login', () => {
    it('should authenticate user and return JWT token', async () => {
      // Créer d'abord un utilisateur
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(testSetup.app.getHttpServer()).post('/api/auth/register').send(createUserDto);

      // Tester le login
      const response = await request(testSetup.app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: createUserDto.email,
          password: createUserDto.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(createUserDto.email);
    });
  });
});
