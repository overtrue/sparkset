import type { ActionService } from '../services/action_service';
import type { AIProviderService } from '../services/ai_provider_service';
import type { ConversationService } from '../services/conversation_service';
import type { DatasourceService } from '../services/datasource_service';
import type { QueryService } from '../services/query_service';
import type { SchemaService } from '../services/schema_service';

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    DatasourceService: DatasourceService;
    ActionService: ActionService;
    ConversationService: ConversationService;
    SchemaService: SchemaService;
    AIProviderService: AIProviderService;
    QueryService: QueryService;
  }
}
