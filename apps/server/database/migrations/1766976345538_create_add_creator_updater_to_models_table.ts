import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  // 表名数组，需要添加 creator_id 和 updater_id 的表
  protected tables = [
    'datasources',
    'actions',
    'ai_providers',
    'table_schemas',
    'column_definitions',
    'dashboard_widgets',
    'messages',
    'datasets',
    'charts',
    'dashboards',
  ]

  async up() {
    // 为每个表添加 creator_id 和 updater_id
    for (const tableName of this.tables) {
      this.schema.table(tableName, (table) => {
        // 添加 creator_id（创建者）
        table.integer('creator_id').unsigned().nullable()
        table.foreign('creator_id').references('users.id').onDelete('SET NULL')

        // 添加 updater_id（更新者）
        table.integer('updater_id').unsigned().nullable()
        table.foreign('updater_id').references('users.id').onDelete('SET NULL')

        // 添加索引
        table.index(['creator_id'], `${tableName}_creator_id_idx`)
        table.index(['updater_id'], `${tableName}_updater_id_idx`)
      })
    }

    // 数据迁移：将现有记录的 creator_id 和 updater_id 设置为系统用户
    this.defer(async (trx) => {
      const systemUser = await trx.from('users').where('uid', 'system:anonymous').first()
      if (systemUser) {
        for (const tableName of this.tables) {
          const result = await trx.table(tableName)
            .whereNull('creator_id')
            .update({
              creator_id: systemUser.id,
              updater_id: systemUser.id
            })

          if (result > 0) {
            console.log(`✅ Updated ${result} records in ${tableName}`)
          }
        }
      }
    })
  }

  async down() {
    // 回滚：移除字段和外键
    for (const tableName of this.tables) {
      this.schema.table(tableName, (table) => {
        table.dropForeign(['creator_id'])
        table.dropForeign(['updater_id'])
        table.dropColumn('creator_id')
        table.dropColumn('updater_id')
      })
    }
  }
}