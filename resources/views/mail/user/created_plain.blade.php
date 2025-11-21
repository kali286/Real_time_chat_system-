Hello {{ $user->name }},

Your account has been created successfully.

Here are your login credentials:

Email: {{ $user->email }}
Password: {{ $password }}

Please log in and change your password as soon as possible for security purposes.

If the button in the HTML email does not work, copy and paste this URL into your browser:

{{ route('auth.clear_and_login', ['next' => route('login')]) }}

Thank you,
{{ config('app.name') }}
