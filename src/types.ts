export type User = {
	name: string;
	phoneNumber: string;
	timezone: string;
	subscriptionStatus: 'active' | 'inactive';
	currentCallDay: number;
	lastCallTimestamp?: string;
};

export type Script = {};

export type Session = {};
