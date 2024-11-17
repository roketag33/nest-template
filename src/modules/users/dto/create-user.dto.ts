import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com', description: 'The email of the user' })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'password123',
        description: 'The password of the user',
        minLength: 6
    })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({
        example: 'John Doe',
        description: 'The name of the user',
        required: false
    })
    @IsString()
    name?: string;
}