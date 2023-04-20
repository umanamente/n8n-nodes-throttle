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
		// show amount of executions per interval in node subtitle
		subtitle: '={{ ($parameter["executions"] == 1 )? "" : $parameter["executions"] + " executions per " }}{{ $parameter["interval"] + " " + $parameter["unit"] }}',
		defaults: {
			name: 'Throttle',
		},
		inputs: ['main'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main'],
		outputNames: outputNames,
		properties: [
			// show note that this node will not work when triggered manually
			{
				displayName: 'This node will not work when workflow is triggered manually.\nIt will only throttle executions when triggered by a webhook, timer or other trigger',
				name: 'warningManualTrigger',
				type: 'notice',
				default: '',
			},
			// show warning that this node will not work for concurrent executions
			{
				displayName: '<b>WARNING: </b> This node will not work properly for concurrent executions. It will only throttle sequential executions. It is recommended to set N8N <a href="https://docs.n8n.io/hosting/scaling/execution-modes-processes/" target="_blank">EXECUTIONS_PROCESS mode</a> to "main", so all executions will be sequential.',
				name: 'warningConcurrentExecutions',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
					},
				}
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
			// executions allowed per specified interval
			{
				displayName: 'Executions per Interval',
				name: 'executions',
				type: 'number',
				default: 1,
				description: 'Number of executions allowed per specified interval',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// check node static variable for last execution time
		const nodeStaticData = this.getWorkflowStaticData('node');
		const lastExecution = nodeStaticData.lastExecution as number || 0;
		const executionsAmount = nodeStaticData.executionsAmount as number || 0;

		// check if executions amount is not reached yet
		const allowedExecutions = this.getNodeParameter('executions', 0) as number;
		const executionsLimitNotReached = executionsAmount < allowedExecutions;

		if (executionsLimitNotReached) {
			// update executions amount
			nodeStaticData.executionsAmount = executionsAmount + 1;

			// send items to allowed output
			return this.prepareOutputData(items, allowedOutputIndex);
		}

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
			// reset executions amount
			nodeStaticData.executionsAmount = 1;
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
