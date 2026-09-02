import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(), context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const userFarm = await this.prisma.userFarm.findFirst({
      where: { userId: user.userId, farmId: user.farmId },
    });
    if (!userFarm) return false;
    return requiredRoles.includes(userFarm.role);
  }
}
