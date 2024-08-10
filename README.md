# scalingslideshow
demo for scaling video slideshow generator built on aws


if we cant use the cloudformation we can deploy using cloud cli AWSCLI like so.

## Create ECS Cluster
1.  aws ecs create-cluster --cluster-name MyCluster

    ### Create an ECR Repository:

    1.2 - aws ecr create-repository --repository-name my-repo

    ### 
    Authenticate Docker to Your ECR Registry:

    1.3 - aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.ap-southeast-2.amazonaws.com

    ### Build Your Docker Image:
    1.4 - docker build -t my-repo .

    ### Tag Your Docker Image:
    1.5 - docker tag my-repo:latest <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/my-repo:latest

    ### Push Your Docker Image to ECR:
    1.6 - docker push <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/my-repo:latest


    (then update ecs task definition to use ecr image)

    ```
    aws ecs register-task-definition --family my-task --network-mode awsvpc --requires-compatibilities FARGATE --cpu '256' --memory '512' --container-definitions '[
  {
    "name": "nginx-nodejs",
    "image": "<aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/my-repo:latest",
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "essential": true,
    "environment": [
      {
        "name": "S3_BUCKET",
        "value": "my-photo-bucket"
      },
      {
        "name": "SQS_QUEUE",
        "value": "my-photo-queue"
      }
    ]
  },
  {
    "name": "ffmpeg-processor",
    "image": "ffmpeg:latest",
    "essential": false,
    "environment": [
      {
        "name": "S3_BUCKET",
        "value": "my-photo-bucket"
      },
      {
        "name": "SQS_QUEUE",
        "value": "my-photo-queue"
      }
    ]
  }
]'
```


## Create S3 Bucket:
2. ws s3api create-bucket --bucket my-photo-bucket --region ap-southeast-2

## create SQS Queue
3. aws sqs create-queue --queue-name my-photo-queue

## Create ECS Task Definition
```
aws ecs register-task-definition --family my-task --network-mode awsvpc --requires-compatibilities FARGATE --cpu '256' --memory '512' --container-definitions '[
  {
    "name": "nginx-nodejs",
    "image": "nginx:latest",
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "essential": true,
    "environment": [
      {
        "name": "S3_BUCKET",
        "value": "my-photo-bucket"
      },
      {
        "name": "SQS_QUEUE",
        "value": "my-photo-queue"
      }
    ]
  },
  {
    "name": "ffmpeg-processor",
    "image": "ffmpeg:latest",
    "essential": false,
    "environment": [
      {
        "name": "S3_BUCKET",
        "value": "my-photo-bucket"
      },
      {
        "name": "SQS_QUEUE",
        "value": "my-photo-queue"
      }
    ]
  }
]'
```

## Create ECS Service:
5.
aws ecs create-service --cluster MyCluster --service-name MyService --task-definition my-task --desired-count 1