/**
 * Menu Module (P183)
 *
 * Handles menu categories and menu items CRUD.
 * Menu data is sourced from Sanity CMS and synced to MongoDB.
 *
 * @module svc-storefronts/menu/menu.module
 */

import { Module } from '@nestjs/common';

import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
