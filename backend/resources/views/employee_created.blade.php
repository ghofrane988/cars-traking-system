<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Account Created</title>
</head>
<body>
    <h2>Welcome {{ $employee->nom }} 👋</h2>

    <p>Your account has been created successfully in our system.</p>

    <p><strong>Email:</strong> {{ $employee->email }}</p>
    <p><strong>Password:</strong> {{ $password }}</p>

    <br>

    <p>Please login and change your password immediately for security reasons.</p>

    <br>

    <p>Best regards,<br>Vehicle Management System</p>
</body>
</html>