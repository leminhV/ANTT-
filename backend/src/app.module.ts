import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ChemicalsModule } from './chemicals/chemicals.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReportsModule } from './reports/reports.module';
import { CheckInModule } from './check-in/check-in.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, RoomsModule, EquipmentModule, ChemicalsModule, BookingsModule, ReportsModule, CheckInModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
