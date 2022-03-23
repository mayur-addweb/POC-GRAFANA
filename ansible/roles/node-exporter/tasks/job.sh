#!/bin/bash
remote_ip=$1
sed -i "s/ip/$remote_ip/g" /home/ubuntu/ansible/roles/node-exporter/tasks/job_name

sudo cat /home/ubuntu/ansible/roles/node-exporter/tasks/job_name >> /usr/local/bin/prometheus/prometheus.yml
