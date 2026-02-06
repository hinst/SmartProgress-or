export class Config {
	constructor(
		public readonly goalId: string,
		public readonly postgresUrl: string,
		public readonly migrate: boolean,
	) {
	}
}