// import { v4 as uuidv4 } from 'uuid';

const AWS_REGION = process.env.AWS_REGION!;

export class S3 {
	static getUrl(bucket: string, key: string) {
		return `https://${bucket}.s3.${AWS_REGION}.amazonaws.com/${key}`;
	}
}
