function createDefaultGuildData() {
  return {
    config: {
      tickets: {
        types: [
          {
            id: 'parceria',
            name: 'Parceria',
            keywords: ['parceria', 'parceiro', 'divulgacao', 'divulgação', 'collab'],
            allowedRoleIds: [],
            categoryId: null,
            transcriptChannelId: null
          },
          {
            id: 'suporte',
            name: 'Suporte',
            keywords: ['suporte', 'ajuda', 'erro', 'bug', 'problema'],
            allowedRoleIds: [],
            categoryId: null,
            transcriptChannelId: null
          },
          {
            id: 'denuncia',
            name: 'Denuncia',
            keywords: ['denuncia', 'denúncia', 'report', 'acusacao', 'acusação'],
            allowedRoleIds: [],
            categoryId: null,
            transcriptChannelId: null
          }
        ]
      },
      voiceRanks: [
        {
          id: 'staff',
          name: 'Staff',
          roleIds: [],
          reportChannelId: null,
          includeEveryone: false
        },
        {
          id: 'comunidade',
          name: 'Comunidade',
          roleIds: [],
          reportChannelId: null,
          includeEveryone: true
        }
      ],
      economy: {
        currencyName: 'coins',
        rewards: {
          daily: 500,
          weekly: 2500,
          monthly: 9000,
          workMin: 120,
          workMax: 420
        },
        cooldownsMs: {
          daily: 86400000,
          weekly: 604800000,
          monthly: 2592000000,
          work: 1800000
        },
        shop: [
          {
            id: 'perfil-azul',
            name: 'Perfil Azul Premium',
            description: 'Tema azul profissional para o perfil.',
            price: 3000,
            type: 'profileTheme',
            value: 'azul'
          },
          {
            id: 'perfil-verde',
            name: 'Perfil Verde Elite',
            description: 'Tema verde elegante para o perfil.',
            price: 3000,
            type: 'profileTheme',
            value: 'verde'
          }
        ]
      }
    },
    tickets: {
      open: {}
    },
    voice: {
      activeSessions: {},
      totalsMs: {}
    },
    economy: {
      users: {},
      transactions: []
    }
  };
}

module.exports = { createDefaultGuildData };
