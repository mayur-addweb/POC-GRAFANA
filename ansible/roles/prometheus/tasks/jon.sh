#!/bin/bash
#sed -i "s/projectname/$project_name/g" /etc/nginx/sites-available/"$project_name".conf

sudo cat /home/ubuntu/ansible/job_name >> /usr/local/bin/prometheus/prometheus.yml
