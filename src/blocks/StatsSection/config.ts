import type { Block } from 'payload'

export const StatsSection: Block = {
  slug: 'statsSection',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Heading',
      required: true,
      defaultValue: 'Integration That Delivers Results',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      defaultValue: 'Every Commerx solution is designed to connect data, systems, and strategy - transforming complexity into measurable performance.',
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Background Image',
    },
    {
      name: 'stats',
      type: 'array',
      label: 'Statistics',
      minRows: 1,
      fields: [
        {
          name: 'value',
          type: 'text',
          label: 'Value (e.g. 25%)',
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          required: true,
        },
      ],
    },
  ],
  labels: {
    plural: 'Stats Sections',
    singular: 'Stats Section',
  },
}
