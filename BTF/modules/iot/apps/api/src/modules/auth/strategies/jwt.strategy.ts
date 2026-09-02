import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'bloody-turkey-secret-key-2026',
    });
  }
  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { farms: { select: { farmId: true, role: true } } },
    });
    if (!user) return null;
    return {
      userId: user.id, email: user.email, role: user.role,
      farmIds: user.farms.map(f => f.farmId),
      farmRoles: user.farms.reduce((acc, f) => ({ ...acc, [f.farmId]: f.role }), {}),
    };
  }
}
