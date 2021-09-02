import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @MaxLength(1000)
  @IsNotEmpty()
  readonly roomId: string;

  @IsString()
  @MaxLength(1000)
  @IsNotEmpty()
  readonly username: string;
}
