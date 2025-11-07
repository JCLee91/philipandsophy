#!/bin/bash
# Deploy all Firestore indexes to Seoul DB (async mode)

PROJECT_ID="philipandsophy"
DATABASE_ID="seoul"

echo "🔥 Deploying Firestore indexes to Seoul DB (async mode)..."
echo "⏳ All index creation requests will be submitted without waiting"
echo "📊 Check progress: https://console.firebase.google.com/project/$PROJECT_ID/firestore/databases/$DATABASE_ID/indexes"
echo ""

# Index 2: participants (cohortId, name)
echo "📊 [2/15] Creating index: participants (cohortId, name)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=participants \
  --field-config field-path=cohortId,order=ascending \
  --field-config field-path=name,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 3: messages (conversationId, createdAt)
echo "📊 [3/15] Creating index: messages (conversationId, createdAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=messages \
  --field-config field-path=conversationId,order=ascending \
  --field-config field-path=createdAt,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 4: messages (conversationId, receiverId, isRead)
echo "📊 [4/15] Creating index: messages (conversationId, receiverId, isRead)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=messages \
  --field-config field-path=conversationId,order=ascending \
  --field-config field-path=receiverId,order=ascending \
  --field-config field-path=isRead,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 5: reading_submissions (submissionDate, status)
echo "📊 [5/15] Creating index: reading_submissions (submissionDate, status)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=reading_submissions \
  --field-config field-path=submissionDate,order=ascending \
  --field-config field-path=status,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 6: reading_submissions (participantId, submittedAt)
echo "📊 [6/15] Creating index: reading_submissions (participantId, submittedAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=reading_submissions \
  --field-config field-path=participantId,order=ascending \
  --field-config field-path=submittedAt,order=descending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 7: reading_submissions (participationCode, submittedAt)
echo "📊 [7/15] Creating index: reading_submissions (participationCode, submittedAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=reading_submissions \
  --field-config field-path=participationCode,order=ascending \
  --field-config field-path=submittedAt,order=descending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 8: reading_submissions (status, submittedAt)
echo "📊 [8/15] Creating index: reading_submissions (status, submittedAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=reading_submissions \
  --field-config field-path=status,order=ascending \
  --field-config field-path=submittedAt,order=descending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 9: reading_submissions (participantId, submissionDate)
echo "📊 [9/15] Creating index: reading_submissions (participantId, submissionDate)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=reading_submissions \
  --field-config field-path=participantId,order=ascending \
  --field-config field-path=submissionDate,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 10: notice_templates (category, order)
echo "📊 [10/15] Creating index: notice_templates (category, order)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=notice_templates \
  --field-config field-path=category,order=ascending \
  --field-config field-path=order,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 11: reading_submissions (cohortId, submittedAt)
echo "📊 [11/15] Creating index: reading_submissions (cohortId, submittedAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=reading_submissions \
  --field-config field-path=cohortId,order=ascending \
  --field-config field-path=submittedAt,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 12: participants (cohortId, createdAt)
echo "📊 [12/15] Creating index: participants (cohortId, createdAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=participants \
  --field-config field-path=cohortId,order=ascending \
  --field-config field-path=createdAt,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 13: messages (senderId, createdAt)
echo "📊 [13/15] Creating index: messages (senderId, createdAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=messages \
  --field-config field-path=senderId,order=ascending \
  --field-config field-path=createdAt,order=descending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 14: messages (receiverId, createdAt)
echo "📊 [14/15] Creating index: messages (receiverId, createdAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=messages \
  --field-config field-path=receiverId,order=ascending \
  --field-config field-path=createdAt,order=descending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 15: reading_submissions (participantId, status, submissionDate, updatedAt)
echo "📊 [15/15] Creating index: reading_submissions (participantId, status, submissionDate, updatedAt)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=reading_submissions \
  --field-config field-path=participantId,order=ascending \
  --field-config field-path=status,order=ascending \
  --field-config field-path=submissionDate,order=ascending \
  --field-config field-path=updatedAt,order=descending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

# Index 16: messages (receiverId, isRead)
echo "📊 [16/15] Creating index: messages (receiverId, isRead)"
~/google-cloud-sdk/bin/gcloud firestore indexes composite create \
  --database=$DATABASE_ID \
  --collection-group=messages \
  --field-config field-path=receiverId,order=ascending \
  --field-config field-path=isRead,order=ascending \
  --project=$PROJECT_ID \
  --async 2>&1 | grep -E "(Created|ERROR)" || echo "   ✓ Request submitted"

echo ""
echo "✅ All index creation requests submitted!"
echo "⏳ Indexes are being created in the background (may take 5-10 minutes)"
echo "📊 Check status: https://console.firebase.google.com/project/$PROJECT_ID/firestore/databases/$DATABASE_ID/indexes"
echo ""
echo "💡 To check if all indexes are ready, look for 'Enabled' status in the console"
