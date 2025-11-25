import type {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class PostgresExtended implements ICredentialType {
    name = 'postgresExtended';

    displayName = 'Postgres Extended';

    documentationUrl = 'postgres';

    icon = 'file:postgres.svg';

    properties: INodeProperties[] = [
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: 'localhost',
        },
        {
            displayName: 'Database',
            name: 'database',
            type: 'string',
            default: 'postgres',
        },
        {
            displayName: 'User',
            name: 'user',
            type: 'string',
            default: 'postgres',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Port',
            name: 'port',
            type: 'number',
            default: 5432,
        },
        {
            displayName: 'SSL',
            name: 'ssl',
            type: 'options',
            displayOptions: {
                show: {
                    nodeVersion: [2, 2.1, 2.2, 2.3, 2.4],
                },
            },
            options: [
                {
                    name: 'Disable',
                    value: 'disable',
                },
                {
                    name: 'Allow',
                    value: 'allow',
                },
                {
                    name: 'Require',
                    value: 'require',
                },
                {
                    name: 'Verify (Not Implemented)',
                    value: 'verify',
                },
                {
                    name: 'Verify-Full (Not Implemented)',
                    value: 'verify-full',
                },
            ],
            default: 'disable',
        },
        {
            displayName: 'RLS Role (Optional)',
            name: 'rlsRole',
            type: 'string',
            default: '',
            description: 'PostgreSQL role to use for Row Level Security. Leave empty to use the connection user.',
            placeholder: 'app_user',
        },
    ];
}
