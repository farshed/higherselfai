const AWS_REGION = process.env.AWS_REGION!;
const AWS_BUCKET = process.env.AWS_BUCKET!;

export class S3 {
	static getURL(key: string) {
		return `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
	}
}
