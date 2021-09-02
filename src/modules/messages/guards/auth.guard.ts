import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.split(' ')[1];
    const isValidToken = await this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    });
    if (!isValidToken) {
      return false;
    }
    const decode = this.jwtService.decode(token, {
      json: true,
    });
    request.username = decode['username'];
    request.roomId = decode['roomId'];
    return true;
  }
}
