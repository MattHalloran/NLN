#!/bin/bash
docker exec -i nln_db psql -U nlnuser -d nlndb -t -c "SELECT DISTINCT if2.src FROM image_file if2;" | sed 's/^ *//' | sed 's|images/||' | sort > /tmp/db_files.txt
ls -1 /root/NLN/assets/images | sort > /tmp/disk_files.txt
echo "Files on disk but not in database:"
comm -13 /tmp/db_files.txt /tmp/disk_files.txt
