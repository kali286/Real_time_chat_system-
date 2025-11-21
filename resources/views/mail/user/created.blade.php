<x-mail::message>
Hello {{ $user->name }},

Your account has been created successfully.

**Here are your login credentials:**<br>

Email: {{ $user->email }} <br>
Password: {{ $password }}

Please log in and change your password as soon as possible for security purposes.

@php
    $loginUrl = route('auth.clear_and_login', ['next' => route('login')]);
@endphp

<x-mail::button :url="$loginUrl">
    Click here to login
</x-mail::button>

{{-- Plain-text fallback for clients that display the text part only (MailPit shows plain view sometimes) --}}
<x-mail::subcopy>
If the button above does not work, copy and paste the following URL into your browser:

{{ $loginUrl }}
</x-mail::subcopy>

Thank you.
{{ config('app.name') }}

</x-mail::message>
 