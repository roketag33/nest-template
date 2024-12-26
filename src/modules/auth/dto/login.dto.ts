import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password for the user account (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

// Response DTO pour la documentation Swagger
export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    example: {
      id: 1,
      email: 'user@example.com',
      name: 'John Doe',
    },
  })
  user?: {
    id: number;
    email: string;
    name?: string;
  };

  @ApiProperty({
    example: true,
    description: 'Indicates if 2FA verification is required',
    required: false,
  })
  require2FA?: boolean;
}

// DTO pour la vérification 2FA
export class Verify2FADto {
  @ApiProperty({
    example: '123456',
    description: 'Six-digit 2FA token',
  })
  @IsString()
  @MinLength(6)
  token: string;
}
