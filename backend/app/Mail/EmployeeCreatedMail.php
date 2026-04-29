<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmployeeCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $employee;
    public $password;

    public function __construct($employee, $password)
    {
        $this->employee = $employee;
        $this->password = $password;
    }

    public function build()
    {
        return $this->subject('Your Account Credentials')
            ->view('employee_created');
    }
}