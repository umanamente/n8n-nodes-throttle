import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

const allowedOutputIndex = 0;
const blockedOutputIndex = 1;
const outputNames = ['allow', 'block'];

export class Throttle implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Throttle',
		name: 'throttle',
		icon: 'file:filter.svg',
		group: ['transform'],
		version: 1,
		description: "Limits the frequence of execution of subsequent nodes. Useful for rate limiting.",
		subtitle: '={{$parameter["interval"] + " " + $parameter["unit"]}}',
		defaults: {
			name: 'Throttle',
		},
		inputs: ['main'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main'],
		outputNames: outputNames,
		properties: [
			// show note that this node will not work when triggered manyally
			{
				displayName: 'This node will not work when workflow is triggered manually.\nIt will only throttle executions when triggered by a webhook, timer or other trigger',
				name: 'warning',
				type: 'notice',
				default: '',
			},
			// interval between executions
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				default: 10,
				description: 'Interval between executions',
			},
			// unit of interval
			{
				displayName: 'Interval Unit',
				name: 'unit',
				type: 'options',
				default: 'seconds',
				options: [
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
					{
						name: 'Days',
						value: 'days',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// check node static variable for last execution time
		const nodeStaticData = this.getWorkflowStaticData('node');
		const lastExecution = nodeStaticData.lastExecution as number || 0;

		// calculate next allowed execution time
		const interval = this.getNodeParameter('interval', 0) as number;
		const unit = this.getNodeParameter('unit', 0) as string;
		var intervalSeconds = 0;
		switch (unit) {
			case 'seconds':
				intervalSeconds = interval;
				break;
			case 'minutes':
				intervalSeconds = interval * 60;
				break;
			case 'hours':
				intervalSeconds = interval * 60 * 60;
				break;
			case 'days':
				intervalSeconds = interval * 60 * 60 * 24;
				break;
		}
		const nextExecution = lastExecution + intervalSeconds * 1000;
		const currentTime = new Date().getTime();

		const executonAllowed = currentTime >= nextExecution;

		if (executonAllowed) {
			// update last execution time
			nodeStaticData.lastExecution = currentTime;

			// send items to allowed output
			return this.prepareOutputData(items, allowedOutputIndex);
		} else {
			// send items to blocked output
			return this.prepareOutputData(items, blockedOutputIndex);
		}
	}
}
