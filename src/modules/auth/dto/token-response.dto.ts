import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT access token'
    })
    access_token: string;

    @ApiProperty({
        example: {
            id: 1,
            email: 'user@example.com',
            name: 'John Doe'
        }
    })
    user: {
        id: number;
        email: string;
        name: string;
    };
}